# ATSYS Mobile — Proof of Concept

A working slice of the [ATSYS mobile roadmap](./): **Phase 0.5 (Licensing)** and
**Phases 1–2 (SF2 load + QR scan/mark/save)**. It's a real Expo/TypeScript app,
not a mockup — it builds to an installable Android APK.

## What it actually does

1. **EULA** gate on first run (placeholder text — swap in the real EULA.txt from
   the PC installer before distributing beyond this POC).
2. **License activation** against the same Firebase RTDB project the PC app
   (`attendance_system_v4_5_2.py`) already uses — key validation, one-device
   hardware lock, hardware/sharing reporting, persistent local storage, and a
   10-second periodic re-verification poll that fails open when offline.
3. **Pick an SF2 .xlsx file**, parse it with SheetJS exactly like
   `_load_file_impl` on the PC: find today's date column, build the student
   list, read existing ✓ marks.
4. **Scan QR codes** (or tap the roster directly) to mark a student present.
   Each mark writes `✓` into the in-memory workbook, saves atomically (temp
   file + rename), and reloads from disk — mirrors `auto_save_attendance`.
5. **Share the updated file** back out via the native share sheet so you can
   open it in Excel and confirm the ✓ landed in the right cell.

## What's simplified vs. the PC app

| PC app | This POC |
|---|---|
| WMI UUID hardware fingerprint | Android ID (`expo-application`), SHA-256 hashed |
| Sequential `HWID_PRIMARY`/`HWID_SECONDARY` labels + counter file | Device keyed directly by its hashed ID — same outcome, no counter file needed |
| 3-attempt license re-entry dialog | Single re-entry screen, no attempt limit |
| Full EULA.txt | Placeholder text |
| Layout Wizard with auto-detect | Fixed layout defaults only (date row 11, students from row 13, name in column B) |

Everything else — the Firebase validate/lock/report/poll sequence, the
fail-open behavior on network errors, the atomic save pattern, the 2-second
scan debounce — is a direct port of the PC's logic.

## Built on a recent Expo SDK — read this before changing anything

This project uses **Expo SDK 56**, which is newer than most tutorials and
training-data knowledge of Expo. Two APIs that changed and matter here:

- **`expo-file-system`** got a full rewrite in SDK 54. The old
  `FileSystem.readAsStringAsync` / `writeAsStringAsync` style API now throws
  at runtime. This project uses the new `File` / `Directory` / `Paths`
  class-based API (see `src/sf2/sf2.ts`). If you're pasting in older example
  code, it almost certainly uses the deprecated API and will need adapting.
- **`expo-barcode-scanner`** is gone. Scanning is built into `expo-camera`'s
  `CameraView` via the `onBarcodeScanned` prop (see `src/scan/ScanScreen.tsx`).

If anything in here needs changing, check `https://docs.expo.dev/versions/v56.0.0/`
for the current API rather than relying on older trained knowledge of Expo.

## Running it yourself

```bash
npm install
npx expo start
```

Scan the QR with Expo Go for a quick look, **but**: camera barcode scanning
and file picking work in Expo Go, while EAS-style native builds aren't needed
for this level of testing. For the real device behavior (and to test the
license's Android ID lookup), build and install the APK from CI (below) or
run `npx expo run:android` locally with Android Studio installed.

## GitHub Actions build

`.github/workflows/build-android.yml` builds a debug APK **entirely on
GitHub's runners** — no EAS account, no Expo token, no secrets required:

1. Push this repo to GitHub.
2. Actions runs automatically on push to `main` (or trigger it manually from
   the Actions tab — "Run workflow").
3. It type-checks, runs `expo prebuild` to generate the native Android
   project, then `./gradlew assembleDebug`.
4. Download the APK from the run's **Artifacts** section — install it on a
   test device via `adb install` or by copying it over and tapping it.

This intentionally skips EAS Build/cloud signing — it's the same
self-contained pattern GitHub itself uses for React Native Android CI: no
external service, just Node + the JDK + the Android SDK that's already
preinstalled on `ubuntu-latest` runners.

## Setting up a real license key for testing

The `validateLicense()` flow expects a key that exists under `/licenses` in
the same Firebase RTDB project the PC app uses
(`https://licenses-5c397-default-rtdb.firebaseio.com`, set in
`src/constants.ts`). Use a license key you've already issued for the PC app
to test end-to-end — or point `FIREBASE_CONFIG.databaseURL` at a throwaway
RTDB project with `{ "licenses": { "TESTKEY": { "active": true } } }`
seeded in if you want to test without touching production data.

## Known limitations / what to verify on a real device

I validated this as thoroughly as I could without a physical device or an
Android emulator:

- TypeScript compiles clean (`npx tsc --noEmit`).
- Metro successfully bundles the whole app to Hermes bytecode
  (`npx expo export --platform android`), so every import resolves and
  there are no syntax errors.
- `expo prebuild` generates a valid native Android project with the camera
  permission and `expo-camera` config plugin correctly applied.
- SheetJS's `type: 'array'` read/write round-trip was verified directly
  in Node (write returns an `ArrayBuffer`, which the code wraps in a
  `Uint8Array` before handing it to `File.write()`).

What I *couldn't* verify locally (no Android SDK/emulator in this
environment) — worth checking on first real run:
- That `./gradlew assembleDebug` actually succeeds on the GitHub runner
  (should work — `ubuntu-latest` ships a compatible Android SDK — but this
  is the first time this exact dependency set has been built).
- Real-device behavior of `CameraView`'s QR detection and `Application.getAndroidId()`.
- Whether the Firebase RTDB rules on the existing `licenses-5c397` project
  allow reads from a new origin/app — if license validation gets a 401/403
  that isn't already handled, that's the first place to look.
