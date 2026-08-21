package com.freekiosk

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

/**
 * Persists and schedules a daily full-device reboot entirely on the Android side.
 *
 * Settings live in device-protected storage so they are available at
 * LOCKED_BOOT_COMPLETED, before credential-encrypted React Native storage is ready.
 */
object ScheduledRebootManager {
    private const val TAG = "ScheduledRebootManager"
    private const val PREFS_NAME = "FreeKioskScheduledReboot"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    private const val KEY_NEXT_TRIGGER_MS = "next_trigger_ms"
    private const val REQUEST_CODE = 2010

    data class Settings(
        val enabled: Boolean,
        val hour: Int,
        val minute: Int,
        val nextTriggerAt: Long,
    )

    private fun storageContext(context: Context): Context =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createDeviceProtectedStorageContext()
        } else {
            context
        }

    private fun prefs(context: Context) =
        storageContext(context).getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun readSettings(context: Context): Settings {
        val preferences = prefs(context)
        return Settings(
            enabled = preferences.getBoolean(KEY_ENABLED, false),
            hour = preferences.getInt(KEY_HOUR, 4).coerceIn(0, 23),
            minute = preferences.getInt(KEY_MINUTE, 0).coerceIn(0, 59),
            nextTriggerAt = preferences.getLong(KEY_NEXT_TRIGGER_MS, 0L),
        )
    }

    fun configure(context: Context, enabled: Boolean, hour: Int, minute: Int): Settings {
        require(hour in 0..23) { "Hour must be between 0 and 23" }
        require(minute in 0..59) { "Minute must be between 0 and 59" }

        // Commit synchronously so the schedule is durable even if the tablet reboots
        // immediately after the user changes the setting.
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .commit()

        if (enabled) {
            scheduleNext(context)
        } else {
            cancel(context)
        }
        return readSettings(context)
    }

    /**
     * Schedule the next local-time occurrence. If today's configured time has already
     * passed, tomorrow is used. Missed reboot times are intentionally never replayed.
     */
    fun scheduleNext(context: Context): Long {
        val settings = readSettings(context)
        if (!settings.enabled) {
            cancel(context)
            return 0L
        }

        val now = System.currentTimeMillis()
        val target = calculateNextTrigger(now, settings.hour, settings.minute)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = rebootPendingIntent(context)

        // Prefer an exact alarm when Android already grants that capability. FreeKiosk does
        // not request a new special exact-alarm permission solely for this feature; when it
        // is unavailable, setAndAllowWhileIdle() remains fully local but Android may defer it.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    target,
                    pendingIntent,
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    target,
                    pendingIntent,
                )
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                target,
                pendingIntent,
            )
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                target,
                pendingIntent,
            )
        }

        prefs(context).edit().putLong(KEY_NEXT_TRIGGER_MS, target).apply()
        Log.i(
            TAG,
            "Scheduled daily reboot for ${String.format("%02d:%02d", settings.hour, settings.minute)} at $target",
        )
        return target
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(rebootPendingIntent(context))
        prefs(context).edit().putLong(KEY_NEXT_TRIGGER_MS, 0L).apply()
        Log.i(TAG, "Scheduled device reboot cancelled")
    }

    fun isDeviceOwner(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }

    /**
     * Called by ScheduledRebootReceiver when the alarm fires.
     *
     * Tomorrow is scheduled first. A successful reboot clears AlarmManager state and the
     * boot broadcast schedules again; if reboot fails, the next-day alarm still remains.
     */
    fun performScheduledReboot(context: Context) {
        val settings = readSettings(context)
        if (!settings.enabled) {
            Log.i(TAG, "Ignoring reboot alarm because scheduled reboot is disabled")
            cancel(context)
            return
        }

        scheduleNext(context)

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, DeviceAdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            Log.e(TAG, "Scheduled reboot disabled: FreeKiosk is no longer Device Owner")
            configure(context, false, settings.hour, settings.minute)
            return
        }

        try {
            Log.i(TAG, "Scheduled reboot fired; rebooting device now")
            dpm.reboot(admin)
        } catch (e: Exception) {
            Log.e(TAG, "Scheduled reboot failed: ${e.message}", e)
        }
    }

    internal fun calculateNextTrigger(nowMs: Long, hour: Int, minute: Int): Long {
        require(hour in 0..23) { "Hour must be between 0 and 23" }
        require(minute in 0..59) { "Minute must be between 0 and 59" }

        return Calendar.getInstance().apply {
            timeInMillis = nowMs
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= nowMs) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }.timeInMillis
    }

    private fun rebootPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, ScheduledRebootReceiver::class.java).apply {
            action = ScheduledRebootReceiver.ACTION_SCHEDULED_DEVICE_REBOOT
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
