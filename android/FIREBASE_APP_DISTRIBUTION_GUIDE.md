# DigiSkool - Android APK & Firebase App Distribution Guide

This guide explains how to generate the signed Android `.apk` file and distribute it to your testers via **Firebase App Distribution**.

---

## Method 1: Instant PWA Direct Install (No APK build needed)
Because DigiSkool is fully configured with `manifest.json` and `sw.js`:
1. Open the portal URL on any Android device in Google Chrome:
   `https://ais-pre-kruvyjynefsq3olfgv35lg-739424936138.asia-southeast1.run.app`
2. Tap the bottom banner: **"Install DigiSkool Android App"** (or tap 3 dots Menu > **"Install app"**).
3. The app installs immediately on the Android home screen as a standalone application.

---

## Method 2: Generate Standalone `.apk` File via PWA Builder (1-Click)
1. Go to **[https://www.pwabuilder.com](https://www.pwabuilder.com)**.
2. Enter your live app URL:
   `https://ais-pre-kruvyjynefsq3olfgv35lg-739424936138.asia-southeast1.run.app`
3. Click **Start**. The builder will detect the manifest, icons, and service worker (Score: 100%).
4. Click **Package for Stores** > Select **Android**.
5. Click **Generate APK / Package**.
6. Download the generated `.apk` file (e.g., `DigiSkool-signed.apk`).

---

## Method 3: Distribute via Firebase App Distribution
Once you have the `.apk` file:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **`ai-studio-digiskoolinstitu-00b0de94-6a61-4628-b6fc-bcee9f03f072`**.
3. In the left navigation menu, navigate to **Release & Monitor** > **App Distribution**.
4. Drag and drop your `.apk` file into the upload box.
5. In the **Testers & Groups** section, add your tester emails (e.g. `jameshut629@gmail.com`, `adnanmrao@gmail.com`).
6. Click **Distribute to Testers**.
7. Testers will immediately receive an official email invitation from Firebase with a direct link to install the app on their Android phones!

---

## Method 4: CLI Distribution (Optional)
If you have Firebase CLI installed on your machine:
```bash
npm install -g firebase-tools
firebase login
firebase appdistribution:distribute DigiSkool-signed.apk \
    --app 1:739424936138:android:<YOUR_APP_ID> \
    --testers "jameshut629@gmail.com, adnanmrao@gmail.com" \
    --release-notes "DigiSkool Production Portal Release with Firestore sync"
```
