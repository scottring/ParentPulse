#!/usr/bin/env python3
"""Check an archive or exported IPA; --signed verifies signing and provisioning."""
import argparse, datetime, plistlib, subprocess, tempfile, zipfile
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('artifact', type=Path, help='An .xcarchive directory or exported .ipa')
parser.add_argument('--signed', action='store_true')
args = parser.parse_args()
exported = args.artifact.suffix == '.ipa'
workspace = tempfile.TemporaryDirectory(prefix='relish-release-check-')
if exported:
    root = Path(workspace.name).resolve()
    with zipfile.ZipFile(args.artifact) as archive:
        for name in archive.namelist():
            if not (root / name).resolve().is_relative_to(root):
                raise SystemExit('FAIL invalid IPA path')
        archive.extractall(root)
    app = root / 'Payload/Relish.app'
else:
    app = args.artifact / 'Products/Applications/Relish.app'
def read(path):
    with path.open('rb') as file: return plistlib.load(file)
def check(condition, label):
    if not condition: raise SystemExit('FAIL ' + label)
    print('PASS ' + label)
info = read(app / 'Info.plist')
check(info['CFBundleIdentifier'] == 'my.relish.book', 'bundle identity')
check(info['RelishStartURL'] == 'https://app.relish.my/relish/', 'production start URL')
check(info['CFBundleShortVersionString'] == '1.0.0' and info['CFBundleVersion'].isdigit(), 'version and build number')
check(info.get('MinimumOSVersion') == '27.1', 'minimum supported iOS')
check(set(info['UIDeviceFamily']) == {1, 2}, 'iPhone and iPad support')
check(info.get('CFBundleIcons', {}).get('CFBundlePrimaryIcon', {}).get('CFBundleIconName') == 'AppIcon', 'compiled app icon')
check((app / 'Assets.car').exists(), 'compiled artwork and launch colors')
check(info.get('NSCameraUsageDescription') and info.get('NSMicrophoneUsageDescription'), 'explicit camera and microphone descriptions')
check(not info.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads', False), 'no unrestricted HTTP access')
check(info.get('ITSAppUsesNonExemptEncryption') is False, 'OS cryptography export declaration')
privacy = read(app / 'PrivacyInfo.xcprivacy')
check(privacy['NSPrivacyTracking'] is False and not privacy['NSPrivacyTrackingDomains'], 'no advertising tracking declaration')
data = {item['NSPrivacyCollectedDataType'] for item in privacy['NSPrivacyCollectedDataTypes']}
check({'NSPrivacyCollectedDataTypeEmailAddress','NSPrivacyCollectedDataTypeUserID','NSPrivacyCollectedDataTypePhotosorVideos','NSPrivacyCollectedDataTypeOtherUserContent'} <= data, 'account and hosted content disclosures')
check(not (app / 'PlugIns/RelishTests.xctest').exists(), 'test bundle excluded from release')
if args.signed:
    profile = app / 'embedded.mobileprovision'
    check(profile.exists(), 'embedded signing profile')
    provisioning = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(profile)], stderr=subprocess.DEVNULL))
    check(provisioning['ExpirationDate'] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), 'unexpired provisioning profile')
    check(provisioning['TeamIdentifier'] == ['XT33G7U496'], 'provisioning team')
    check(provisioning['Entitlements'].get('application-identifier') == 'XT33G7U496.my.relish.book', 'provisioned bundle identity')
    subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    entitlements = plistlib.loads(subprocess.check_output(['codesign', '-d', '--entitlements', ':-', str(app)], stderr=subprocess.DEVNULL))
    check(entitlements.get('com.apple.developer.team-identifier') == 'XT33G7U496', 'expected Apple team')
    check(entitlements.get('com.apple.developer.default-data-protection') == 'NSFileProtectionComplete', 'complete file protection')
    check(entitlements.get('application-identifier') == 'XT33G7U496.my.relish.book', 'signed bundle identity')
    if exported:
        check(entitlements.get('get-task-allow') is False, 'distribution debugging disabled')
        check(not provisioning.get('ProvisionedDevices') and not provisioning.get('ProvisionsAllDevices'), 'App Store distribution profile')
    print('Signed package validated locally; Apple server validation and physical checks remain separate.')
else:
    print('Compilation metadata validated only. Signature/install/upload readiness was NOT checked.')
