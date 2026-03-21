# Android Build Guide — QuartierApp

## Voraussetzungen

- Node.js 20+
- Java JDK 17+
- Android SDK (via Android Studio oder Command Line Tools)
- `ANDROID_HOME` Umgebungsvariable gesetzt

## 1. Upload-Keystore generieren

```bash
keytool -genkey -v \
  -keystore quartierapp-upload.keystore \
  -alias quartierapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=QuartierApp, OU=Development, O=QuartierApp, L=Bad Saeckingen, ST=Baden-Wuerttemberg, C=DE"
```

**WICHTIG:** Keystore und Passwort sicher aufbewahren! NICHT ins Git-Repository committen.

## 2. key.properties erstellen

Datei `nachbar-io/android/key.properties` (NICHT committen):

```properties
storePassword=IHR_KEYSTORE_PASSWORT
keyPassword=IHR_KEY_PASSWORT
keyAlias=quartierapp
storeFile=../../quartierapp-upload.keystore
```

## 3. build.gradle fuer Signing konfigurieren

In `android/app/build.gradle` vor dem `buildTypes`-Block:

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... bestehende config ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 4. Web-App bauen und synchronisieren

```bash
cd nachbar-io
npm run build
npx cap sync android
```

## 5. Signiertes AAB bauen

```bash
cd android
./gradlew bundleRelease
```

Das AAB liegt dann unter:
`android/app/build/outputs/bundle/release/app-release.aab`

## 6. Play App Signing

Google verwaltet den Release-Key. Beim ersten Upload in die Play Console:
1. "Let Google manage my app signing key" waehlen
2. Upload-Keystore-Zertifikat hochladen
3. Google generiert den finalen Release-Key

## 7. Keystore-Fingerprint fuer App Links

```bash
keytool -list -v -keystore quartierapp-upload.keystore -alias quartierapp
```

Den SHA-256-Fingerprint in `public/.well-known/assetlinks.json` eintragen
(Platzhalter `KEYSTORE_FINGERPRINT` ersetzen).

## .gitignore Eintraege

Folgende Eintraege muessen in `.gitignore` stehen:

```
*.keystore
*.jks
key.properties
google-services.json
```

## Build-Script

Fuer schnellen Build-Workflow:

```bash
#!/bin/bash
# QuartierApp Android Build
set -e

echo "=== Web-Build ==="
npm run build

echo "=== Capacitor Sync ==="
npx cap sync android

echo "=== Android AAB Build ==="
cd android
./gradlew bundleRelease

echo "=== Fertig ==="
echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
```
