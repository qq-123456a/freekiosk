# FreeKiosk Roddy - Hybrid Dashboard Native Fullscreen

## What looks different

Website tiles (Donation) use FreeKiosk's own immersive Android window. Android-app tiles (Tanda Time Clock) run in the *other app's own window*; a regular `TYPE_APPLICATION_OVERLAY` always stays behind system status bars. Drawing a taller overlay **cannot** hide Android's system status/navigation bars.

Roddy version 3 adds an opt-in path to **genuine system Lock Task** using the **existing** Device Owner's app allowlist. Roddy does **not** claim or remove Device Owner and never attempts screen pinning as a substitute.

## One-time setup on the Lenovo tablet

1. **Do not uninstall the existing Device Owner FreeKiosk (`com.freekiosk`)**.
2. In its administration settings, ensure Android Lock Task is enabled. Add **both** `com.freekiosk.roddy` and the selected clock app (e.g. `co.tanda.timeclock`) to **Managed Apps**. The existing Device Owner must persist its updated lock-task package list. Keep System Info and Notifications disabled if a clean system-bar-free kiosk is desired.
3. In FreeKiosk Roddy, allow Android **Display over other apps**. Set Display Mode = WebView, enable Dashboard Mode, and configure its native app and website tiles.
4. Open Tanda from the Roddy Dashboard. Roddy checks both packages using `DevicePolicyManager.isLockTaskPermitted`; only when **both** are allowed does it invoke `MainActivity.startLockTask()` to enter full device-managed Lock Task. The floating employee HOME navigation is attached and verified **before** entering Lock Task or opening Tanda.
5. Tap Roddy's HOME control to return to the Dashboard. The normal administrator PIN entry and validation logic are unchanged.

If the two packages are not allowlisted, Roddy displays an explanation and offers to open Tanda **with Android system bars**. This is a compatibility fallback, **not** fullscreen.

## Hardware restrictions

- Android Lock Task disables/restricts status/navigation controls, but exactly how much reserved status-bar space the OEM still allocates may differ. The tablet and native Tanda app need visual acceptance tests; do not promise pixel-perfect webpage-like fullscreen from an app overlay alone.
- If Tanda or another app requests the platform to hide overlays (security feature), a native HOME overlay may still be suppressed; the app's own full-screen APIs or a privileged kiosk solution would be needed.
- The third-party native app itself cannot be forced into `WindowInsetsController.hide(systemBars())` by an unrelated ordinary app. Roddy never tries to silently change global Android system settings.
- If a different owner changes its allowlist later or Lock Task is removed, native full-screen depends on the new owner policy; Roddy cannot and does not override it.
- Existing debug-signed `com.freekiosk.roddy` APKs can be updated with a matching signing certificate; no root/ADB needed for the APK upgrade itself.

## Validation checklist

- Dashboard top Back/Forward/Refresh/HOME style unchanged.
- Tanda top native navigation controls: Back, disabled Forward/Refresh, HOME and app title.
- No regular Android status clock/battery row and no Android bottom Home/navigation bar while properly owner-managed and Lock Task is active.
- Tap HOME, choose Donation, navigate back to Tanda and use numeric PIN/IME.
- Test screen wake/reboot, app switch, after 30 minutes, and manager PIN separately.
