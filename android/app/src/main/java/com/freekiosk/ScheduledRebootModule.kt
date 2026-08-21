package com.freekiosk

import android.Manifest
import android.app.ActivityManager
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScheduledRebootModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScheduledRebootModule"

    @ReactMethod
    fun getSettings(promise: Promise) {
        try {
            var settings = ScheduledRebootManager.readSettings(reactApplicationContext)
            val isDeviceOwner = ScheduledRebootManager.isDeviceOwner(reactApplicationContext)

            if (settings.enabled && !isDeviceOwner) {
                settings = ScheduledRebootManager.configure(
                    reactApplicationContext,
                    false,
                    settings.hour,
                    settings.minute,
                )
            } else if (settings.enabled) {
                // Re-register whenever settings are opened. This upgrades an inexact alarm
                // to an exact alarm immediately after the user grants special access.
                ScheduledRebootManager.scheduleNext(reactApplicationContext)
                settings = ScheduledRebootManager.readSettings(reactApplicationContext)
            }

            promise.resolve(toWritableMap(settings, isDeviceOwner))
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to read scheduled reboot settings: ${e.message}")
        }
    }

    @ReactMethod
    fun setSchedule(enabled: Boolean, hour: Int, minute: Int, promise: Promise) {
        try {
            val isDeviceOwner = ScheduledRebootManager.isDeviceOwner(reactApplicationContext)
            if (enabled && !isDeviceOwner) {
                promise.reject("NOT_DEVICE_OWNER", "Scheduled reboot requires Device Owner mode")
                return
            }

            val settings = ScheduledRebootManager.configure(
                reactApplicationContext,
                enabled,
                hour,
                minute,
            )
            promise.resolve(toWritableMap(settings, isDeviceOwner))
        } catch (e: IllegalArgumentException) {
            promise.reject("INVALID_TIME", e.message)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to configure scheduled reboot: ${e.message}")
        }
    }

    @ReactMethod
    fun requestExactAlarmAccess(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || exactAlarmAvailable()) {
                promise.resolve(true)
                return
            }
            if (!exactAlarmRequestSupported()) {
                promise.reject(
                    "UNAVAILABLE",
                    "This build does not declare SCHEDULE_EXACT_ALARM access",
                )
                return
            }

            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
                return
            }

            val activityManager = reactApplicationContext
                .getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val inLockTask = activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE

            activity.runOnUiThread {
                try {
                    if (inLockTask) {
                        activity.stopLockTask()
                        Handler(Looper.getMainLooper()).postDelayed({
                            try {
                                reactApplicationContext.startActivity(intent)
                                promise.resolve(true)
                            } catch (e: Exception) {
                                promise.reject(
                                    "ERROR",
                                    "Failed to open exact alarm settings: ${e.message}",
                                )
                            }
                        }, 300)
                    } else {
                        reactApplicationContext.startActivity(intent)
                        promise.resolve(true)
                    }
                } catch (e: Exception) {
                    promise.reject("ERROR", "Failed to open exact alarm settings: ${e.message}")
                }
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to request exact alarm access: ${e.message}")
        }
    }

    private fun toWritableMap(
        settings: ScheduledRebootManager.Settings,
        isDeviceOwner: Boolean,
    ) = Arguments.createMap().apply {
        putBoolean("enabled", settings.enabled)
        putInt("hour", settings.hour)
        putInt("minute", settings.minute)
        putDouble("nextTriggerAt", settings.nextTriggerAt.toDouble())
        putBoolean("isDeviceOwner", isDeviceOwner)
        putBoolean("exactAlarmAvailable", exactAlarmAvailable())
        putBoolean("exactAlarmRequestSupported", exactAlarmRequestSupported())
    }

    private fun exactAlarmAvailable(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = reactApplicationContext
            .getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }

    @Suppress("DEPRECATION")
    private fun exactAlarmRequestSupported(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        return try {
            val packageInfo = reactApplicationContext.packageManager.getPackageInfo(
                reactApplicationContext.packageName,
                PackageManager.GET_PERMISSIONS,
            )
            packageInfo.requestedPermissions?.contains(Manifest.permission.SCHEDULE_EXACT_ALARM) == true
        } catch (_: Exception) {
            false
        }
    }
}
