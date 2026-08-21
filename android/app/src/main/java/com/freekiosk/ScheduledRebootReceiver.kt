package com.freekiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Handles the reboot alarm and broadcasts that invalidate a previously calculated alarm. */
class ScheduledRebootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ScheduledRebootReceiver"
        const val ACTION_SCHEDULED_DEVICE_REBOOT = "com.freekiosk.ACTION_SCHEDULED_DEVICE_REBOOT"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_SCHEDULED_DEVICE_REBOOT -> ScheduledRebootManager.performScheduledReboot(context)

            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                val settings = ScheduledRebootManager.readSettings(context)
                if (settings.enabled) {
                    Log.i(TAG, "${intent.action}: recalculating scheduled reboot")
                    ScheduledRebootManager.scheduleNext(context)
                }
            }

            else -> Log.w(TAG, "Ignoring unknown action: ${intent.action}")
        }
    }
}
