package com.freekiosk

import android.app.AlarmManager
import android.content.Context
import android.os.Build
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
    }

    private fun exactAlarmAvailable(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = reactApplicationContext
            .getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }
}
