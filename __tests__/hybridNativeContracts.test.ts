// @ts-nocheck
/**
 * Source-level integration guard for the Kotlin / JS native bridge.
 * Jest cannot execute Android DevicePolicyManager or WindowManager without a
 * device. These assertions catch regressions where a future refactor replaces
 * the Hybrid-specific path with the generic launcher, or drops the screen-on
 * flag from the always-visible HOME overlay.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('Hybrid native app integration contract', () => {
  const launcher = source('android/app/src/main/java/com/freekiosk/AppLauncherModule.kt');
  const screen = source('src/screens/KioskScreen.tsx');
  const overlay = source('android/app/src/main/java/com/freekiosk/OverlayService.kt');
  const kiosk = source('android/app/src/main/java/com/freekiosk/KioskModule.kt');

  it('uses a separate native launcher for Dashboard Android app tiles', () => {
    expect(launcher).toContain('fun launchHybridApp(packageName: String, promise: Promise)');
    expect(screen).toContain('await AppLauncherModule.launchHybridApp(packageName)');
    expect(screen).toContain('await AppLauncherModule.launchExternalApp(packageName)');
  });

  it('reuses Single App Lock Task configuration and never overwrites it after native tile launch', () => {
    // KioskModule is the exact same Device Owner implementation that Single App calls.
    expect(screen).toContain('await KioskModule.startLockTask(');
    expect(screen).toContain('StorageService.getAllowPowerButton()');
    expect(screen).toContain('StorageService.getAllowNotifications()');
    expect(screen).toContain('StorageService.getAllowSystemInfo()');
    expect(screen).toContain('StorageService.getLockscreenEmergencyCallEnabled()');
    expect(kiosk).toContain('dpm.setLockTaskPackages(adminComponent, uniqueWhitelist.toTypedArray())');
    expect(kiosk).toContain('dpm.setLockTaskFeatures(adminComponent, lockTaskFeatures)');
    // Generic Single App still works as before; Hybrid does not redundantly reset
    // that policy based on stale values while launching the target.
    expect(launcher).toContain('if (mainActivity.isTaskLocked() && !hybridDashboard)');
    expect(launcher).toContain('launchAppInternal(packageName, false, promise)');
    expect(launcher).toContain('launchAppInternal(packageName, true, promise)');
  });

  it('keeps Tanda awake using the same persisted Keep Screen On setting as Donation', () => {
    expect(kiosk).toContain('putBoolean("keep_screen_on", enabled)');
    expect(overlay).toContain('.getBoolean("keep_screen_on", true)');
    expect(overlay).toContain('if (keepScreenOn) WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON else 0');
    expect(overlay).toContain('overlayWindowFlags,');
    expect(overlay).toContain('fun updateHybridKeepScreenOn(enabled: Boolean)');
    expect(kiosk).toContain('OverlayService.updateHybridKeepScreenOn(enabled)');
    expect(overlay).toContain('updateHybridScreenWakeLock(keepScreenOn)');
    expect(overlay).toContain('fun updateHybridScreenWakeLock(enabled: Boolean)');
    expect(overlay).toContain('android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK');
    expect(overlay).toContain('wakeLock.release()');
    expect(overlay).toContain('updateHybridScreenWakeLock(false)');
  });

  it('keeps Hybrid HOME visible while a separate Android app is foreground', () => {
    expect(overlay).toContain('fun isHybridNativeAppSessionActive(): Boolean');
    expect(overlay).toContain('addNavigationControl("⌂", "HOME - Hybrid Dashboard", true)');
    expect(overlay).toContain('addNavigationControl("←", "Back to Dashboard", true)');
    expect(screen).toContain("finalReturnMode === 'hybrid_home'");
  });
});
