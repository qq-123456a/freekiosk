# Roddy Hybrid Dashboard: Tanda foreground stability and Device Owner migration

## Tanda returned to Dashboard after 10–20 seconds

Before Roddy v4, `KioskWatchdogService` polled every **10,000 ms**. It treated WebView Dashboard as the only valid foreground, even while the Dashboard had intentionally launched a native Android Tanda tile. This could forcibly bring MainActivity/Dashboard over the still-running Tanda app. A website tile didn't trigger that behavior because it stays within FreeKiosk.

Roddy v4 treats a *visible, active native Hybrid session* as intentional foreground use. The watchdog does not relaunch Dashboard while the native HOME overlay is attached. The native HOME button explicitly clears the session; when an app is no longer attached, ordinary watchdog behavior resumes. Existing URL tile inactivity rules stay unchanged.

If Tanda still exits, capture `adb logcat` filtering `KioskWatchdog`, `OverlayService`, `ActivityTaskManager`, `KioskScreen` — the old separate Device Owner FreeKiosk can have its **own** watchdog which this APK cannot modify.

## Device Owner: choices

The old Device Owner is `com.freekiosk/com.freekiosk.DeviceAdminReceiver`. Roddy has **Android application ID** `com.freekiosk.roddy`, but its native receiver **class name** remains `com.freekiosk.DeviceAdminReceiver`. Use the FULL component:

```powershell
.\adb shell dpm set-device-owner com.freekiosk.roddy/com.freekiosk.DeviceAdminReceiver
```

**Do not use** `com.freekiosk.roddy/.DeviceAdminReceiver` — it points at a class which does not exist.

### Option A: keep existing Device Owner (least disruptive)

- In the old FreeKiosk's admin settings, use **General > Background Apps / Managed Apps** and add both **FreeKiosk Roddy** and **Tanda Time Clock**, while retaining the old owner's Lock Mode.
- In Roddy, enable Dashboard with native app and website tiles. Roddy checks the existing DO's actual allowlist using `isLockTaskPermitted()`.
- You cannot grant Roddy Device Owner by enabling its own checkbox. The old owner remains in charge; some older owner's watchdog/policy may need changing if it still interferes.

### Option B: transfer from old owner to Roddy **without clearing ownership** (best if source DPC supports it)

Android 9+ supports atomic `DevicePolicyManager.transferOwnership(sourceAdmin,targetAdmin,bundle)`, which **must be invoked by the currently installed owner app**. Roddy v4 adds `<support-transfer-ownership />` and an ownership-complete receiver callback so it is a viable target.

The currently-installed official FreeKiosk source reviewed here implements `removeDeviceOwner()` but does **not** implement `transferOwnership()`. Therefore it cannot initiate atomic transfer in its current build. Merely installing Roddy cannot initiate ownership transfer. A source-signed upstream update adding a reviewed migration command would be needed; that is NOT included or executed by this Roddy APK.

### Option C: remove old owner, then provision Roddy via ADB (non-atomic, backup first)

This is a **development/test-device procedure**. There is a time window with no Device Owner. New provisioning may fail on an already-configured Android device, in which case a factory reset/reprovision might be necessary.

**Before doing anything irreversible**

1. Check Tanda is online and all pending clock-ins have synced; never uninstall or clear **Tanda Time Clock** data.
2. Export/record FreeKiosk configuration, Donation URL, PIN (stored securely), application list, and write down the current Device Owner. The old FreeKiosk's **Remove Device Owner** operation intentionally clears its own settings/PIN/cookies.
3. Connect Lenovo to Windows ADB. Confirm installed and connected:
   ```powershell
   cd C:\Users\Roddy\Downloads\scrcpy-win64-v3.3
   .\adb devices
   .\adb shell pm path com.freekiosk.roddy
   .\adb shell dumpsys device_policy
   ```
4. Remove personal/Google accounts and secondary users if necessary *before* the owner switch. Do not try to remove the primary Android user. Keep the tablet charged, Wi-Fi available, and a working staff clock-in alternative ready.
5. On **old FreeKiosk** (not Roddy) enter administrator Settings > **Advanced > Remove Device Owner**, read its destructive confirmation and confirm. This calls `DevicePolicyManager.clearDeviceOwnerApp("com.freekiosk")` from the old owner itself (deprecated, best-effort cleanup), then wipes the old FreeKiosk's own settings. This is not a zero-gap transfer.
6. Recheck `dumpsys device_policy`: if the old Device Owner still appears, **STOP**. Do not uninstall it or use `dpm remove-active-admin` on a normal production APK; shell removal works only on APKs marked `android:testOnly`.
7. Once confirmed no owner and no incompatible accounts remain, run:
   ```powershell
   .\adb shell dpm set-device-owner com.freekiosk.roddy/com.freekiosk.DeviceAdminReceiver
   ```
8. Verify:
   ```powershell
   .\adb shell dumpsys device_policy
   ```
   Look for a Device Owner component with package `com.freekiosk.roddy`. If command fails because the device was already provisioned or has accounts, stop — a factory reset may be required. Do not claim successful ownership unless the system confirms it.
9. In Roddy: Display = WebView, Dashboard enabled, Tanda and Donation tiles configured; select Tanda as default; Security > Lock Mode ON; grant overlay permission. Make sure only approved apps are in Managed Apps. Keep Tanda's *own* launcher/kiosk mode OFF.
10. Verify lock behavior, Tanda PIN and synchronization, Home/Back to Donation, status/navigation bars, and reboot before routine shop use.

**Important:** Setting Roddy as Device Owner does not guarantee that Android 12 / Lenovo will let an unprivileged overlay force Tanda's own window into pixel-perfect immersive full-screen. The Android Lock Task policy normally hides/disables system navigation controls; the actual screen layout depends on Tanda and the OEM. Do not use unsafe global UI tweaks without hardware verification.

**Rollback:** DO cannot simply be moved back to the old package. The same ownership transfer or removal/reprovision constraints apply in reverse. Do not enter the owner-removal step until the new APK has passed side-by-side tests.
