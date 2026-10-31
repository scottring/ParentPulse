# Relish for iPhone Duo

A SwiftUI host for the encrypted Relish book, with one persistent WKWebView across folds and resizes. Minimum iOS 27.1; also supports iPad. The responsive book code lives in `src/components/relish`, shared with Safari.

## Run

Open `Relish.xcodeproj`, choose the Relish scheme and the iPhone Duo simulator, then Run. Debug opens `http://127.0.0.1:3210/relish/`; run `npm run dev:local` from the repository first. The generated project is committed so XcodeGen is not needed to run it. After editing `project.yml`, regenerate with `xcodegen generate --spec ios/project.yml` from the repository root.

Command-line simulator check:

```sh
xcodebuild -project ios/Relish.xcodeproj -scheme Relish -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Release always loads `https://app.relish.my/relish/`. A debug build can target an approved HTTPS preview using `RELISH_START_URL` as a build setting. No API keys belong in this app.

## Distribution is a separate step

This development build is not on TestFlight or the App Store. Select the owner's Apple Developer signing team, confirm the `my.relish.book` bundle ID, supply production app icons/privacy declarations/screenshots, and test microphone, camera, encrypted backup export/import, interruption recovery and accessibility on a physical device before archiving for TestFlight. The hosted web change must be merged to main and deployed first; a Release binary points only at production.

The native app and Safari have separate local stores. Move existing editions with Relish's encrypted backup/import, keeping the passphrase separately. Loading the hosted app requires a connection; encrypted books stay local, but this shell does not promise an offline launch. A fold does not lock, reload or create a new entry. Inactivity uses the existing vault timer; app-switcher snapshots are covered immediately.

## Simulator evidence

Built with Xcode 27.2 / iOS 27.2 SDK and run on iPhone Duo / iOS 27.1. Tested outer quick entry → unfold while editing → fold back → Keep, with the same fictional text. Inner portrait and landscape both show a spread. This is simulator evidence, not a physical-device or store-release certification.

Apple references: [prepare your app](https://developer.apple.com/iphone-duo/prepare/), [Safari 27.1](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/). The Device Posture and Viewport Segments APIs are feature-flagged; core behavior does not depend on them.
