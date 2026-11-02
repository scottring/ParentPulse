# Relish for iPhone Duo

A SwiftUI app with a persistent WKWebView: quick entry on the outer screen and a book spread on the inner screen. Folding and rotating preserve the editor. Supports iPhone and iPad on iOS 27.1+. Version 1.0.0, build 2.

## Build and test

Open `Relish.xcodeproj`, choose Relish and an iPhone Duo simulator, then Run. Debug and Release now both open `https://app.relish.my/relish/`; a development build no longer depends on a Mac server. A Debug-only `RELISH_START_URL` build setting may point at localhost:3210 or a Relish Vercel preview. Release ignores that override.

From the repository root:

```sh
# Only needed after changing project.yml or adding/removing native files.
xcodegen generate --spec ios/project.yml
# Only needed after changing the vector icon artwork.
node ios/scripts/make-icons.mjs
xcodebuild -project ios/Relish.xcodeproj -scheme Relish -destination 'platform=iOS Simulator,name=iPhone Duo' -derivedDataPath /private/tmp/Relish-ios-test CODE_SIGNING_ALLOWED=NO test
```

The six native regression tests cover production URL pinning, debug origin validation, exact origin/port checks, backup blob origins, main-frame media permission and safe external navigation. The app uses no native third-party SDKs or credential bridge. Native WebKit inspection is enabled only for Debug builds.

## Signed release

Signing team: Scott Kaufman (`XT33G7U496`). Bundle ID: `my.relish.book`. Sign back into the matching account in **Xcode → Settings → Accounts** if provisioning reports a rejected login. Xcode must be able to register the bundle and download a profile. Do not put account passwords or API keys in this repository.

```sh
xcodebuild -project ios/Relish.xcodeproj -scheme Relish -configuration Release -destination 'generic/platform=iOS' -archivePath /private/tmp/Relish.xcarchive -derivedDataPath /private/tmp/Relish-ios-release -allowProvisioningUpdates archive
python3 ios/scripts/check-release.py /private/tmp/Relish.xcarchive --signed
xcodebuild -exportArchive -archivePath /private/tmp/Relish.xcarchive -exportPath /private/tmp/Relish-export -exportOptionsPlist ios/ExportOptions.plist -allowProvisioningUpdates
python3 ios/scripts/check-release.py /private/tmp/Relish-export/Relish.ipa --signed
```

`ExportOptions.plist` exports an App Store Connect IPA without uploading it. Merge the approved native changes to main, then rebuild/validate from that commit before uploading through Xcode Organizer or Transporter. Confirm the App Store Connect record uses this bundle ID; do not create a duplicate of an existing app. Check the highest uploaded build number before the final archive. TestFlight upload and public App Store release are separate actions.

For compilation checks while signing is unavailable, add `CODE_SIGNING_ALLOWED=NO` to archive and omit `--signed` from the checker. That artifact is explicitly unsigned and cannot be installed on a phone or sent to TestFlight.

## Native behavior

The same web view survives resizing. A fold never saves, shares or reloads a page. The system handles safe areas and keyboard insets. Native code covers app-switcher snapshots, restricts navigation/media/download origins, requests camera/microphone access only when used, and exports encrypted backups through the share sheet. The default file-protection entitlement protects app files while the device is locked; exported temporary files also use complete protection and are removed when sharing finishes.

An internet connection is needed to launch the hosted experience. This is not an offline native rewrite. Account books sync through the signed-in parent account; local-only books are an explicit alternative. Safari and the native app have separate local stores. Sign into the same account to open account books; move older local-only books with encrypted backup/import or the one-time “Add this book to my account” flow in their original browser. Never clear browser/app storage to fix login.

## Before calling the release ready

Use the checklist and privacy/metadata notes in [RELEASE.md](RELEASE.md). Simulator success does not prove physical microphone/camera behavior. The app is not on TestFlight until App Store Connect accepts and processes the signed build.
