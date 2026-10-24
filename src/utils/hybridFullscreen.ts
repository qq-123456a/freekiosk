/**
 * Android app tiles are not a WebView and have their own Android window.
 * Single-App mode hides SystemUI using genuine Device-Owner Lock Task.
 * The Roddy fork must apply the SAME owner policy rather than assuming
 * an overlay can cover Android's privileged status/navigation bars.
 */
export type HybridLockTaskStatus = {
  roddyIsOwner: boolean;
  roddyAllowlisted: boolean;
  targetAllowlisted: boolean;
  mode: 'none' | 'pinned' | 'locked';
  features?: number;
};

// Android DevicePolicyManager constants (API 28+).
const LOCK_TASK_FEATURE_SYSTEM_INFO = 1;
const LOCK_TASK_FEATURE_NOTIFICATIONS = 2;

export function describeHybridFullscreenStatus(
  status: HybridLockTaskStatus | null,
  appLabel = 'Tanda',
): string {
  if (!status) {
    return 'Unable to read the Android Lock Task policy. Do not remove the existing Device Owner. Check FreeKiosk Security > Lock Mode and inspect device policy over ADB.';
  }
  if (status.mode === 'pinned') {
    return 'Android screen pinning is active, not managed Lock Task. Screen pinning cannot safely switch between Dashboard and a separate Android app.';
  }
  if (!status.roddyAllowlisted || !status.targetAllowlisted) {
    const missing = [
      !status.roddyAllowlisted && 'FreeKiosk Roddy',
      !status.targetAllowlisted && appLabel,
    ].filter(Boolean).join(' and ');
    return `Android reports that ${missing} ${missing.includes(' and ') ? 'are' : 'is'} NOT in the active Lock Task allowlist. The installed original FreeKiosk may show them in General > Background Apps, but its Device Owner must actually apply the updated policy. Enable Security > Lock Mode there, then re-apply its settings or restart the original FreeKiosk. Do not uninstall it.`;
  }
  if (status.roddyIsOwner) {
    if (status.mode !== 'locked') {
      return 'Roddy is Device Owner and both apps are approved, but Android is not in managed Lock Task mode. Enable Security > Lock Mode in FreeKiosk Roddy.';
    }
    const flags = status.features ?? 0;
    if (flags & (LOCK_TASK_FEATURE_SYSTEM_INFO | LOCK_TASK_FEATURE_NOTIFICATIONS)) {
      return 'Roddy is Device Owner but Android Lock Task still permits system info or notifications. Turn OFF Show System Info and Allow Notifications under Security > Lock Mode.';
    }
    return 'Roddy is Device Owner and genuine Lock Task is active with system information restricted. If a status row still appears, it belongs to the Android app/OEM window, not the FreeKiosk Dashboard toolbar.';
  }
  if (status.mode !== 'locked') {
    return 'Both packages are allowlisted, but Android has not entered managed Lock Task. In the ORIGINAL Device Owner FreeKiosk, enable Security > Lock Mode and disable Show System Info and Allow Notifications; then reopen the Roddy Dashboard.';
  }
  return 'The ORIGINAL FreeKiosk remains Device Owner and controls Android system bars, even though both apps are allowlisted. In that original FreeKiosk, turn OFF Security > Show System Info and Allow Notifications, then restart its Lock Mode. Alternatively migrate Device Owner to Roddy using a properly signed release build. Merely adding app packages cannot alter the old owner\'s system-bar policy.';
}
