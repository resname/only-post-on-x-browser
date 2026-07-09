#!/usr/bin/env node
/**
 * Generates an auto-incrementing integer version number for the app and
 * writes it to the files used by the bundle and by Expo's native project
 * generation (app.json).
 *
 * The version is stored in version.json in the repository root. Each CI build
 * increments it by one. The resulting value is used as:
 *   - the Android versionCode,
 *   - the Android versionName (via expo.version, formatted as 1.0.x),
 *   - the iOS buildNumber.
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../version.json');
const APP_JSON_FILE = path.resolve(__dirname, '../app.json');
const PACKAGE_JSON_FILE = path.resolve(__dirname, '../package.json');
const WHITELIST_SRC = path.resolve(__dirname, '../url-whitelist.json');
const WHITELIST_BUNDLE = path.resolve(__dirname, '../src/whitelist/whitelist.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function copyWhitelist() {
  const dir = path.dirname(WHITELIST_BUNDLE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(WHITELIST_SRC, WHITELIST_BUNDLE);
  console.log(`Copied bundled whitelist: ${WHITELIST_SRC} -> ${WHITELIST_BUNDLE}`);
}

function bumpVersion() {
  const versionData = readJson(VERSION_FILE, { version: 1 });
  const nextVersion = (versionData.version || 0) + 1;
  versionData.version = nextVersion;
  writeJson(VERSION_FILE, versionData);
  console.log(`Version bumped to: ${nextVersion}`);

  // Update app.json so Expo uses the same value for Android versionCode, iOS
  // buildNumber, and the visible Android versionName.
  const versionName = `1.0.${nextVersion}`;
  const appJson = readJson(APP_JSON_FILE, { expo: {} });
  appJson.expo = appJson.expo || {};
  appJson.expo.version = versionName;
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.ios = appJson.expo.ios || {};
  appJson.expo.android.versionCode = nextVersion;
  appJson.expo.ios.buildNumber = String(nextVersion);
  writeJson(APP_JSON_FILE, appJson);
  console.log(`Updated app.json: version=${versionName}, Android versionCode=${nextVersion}, iOS buildNumber=${nextVersion}`);

  // Keep package.json in sync so the project version matches the release.
  const packageJson = readJson(PACKAGE_JSON_FILE, { version: '1.0.0' });
  packageJson.version = versionName;
  writeJson(PACKAGE_JSON_FILE, packageJson);
  console.log(`Updated package.json: ${versionName}`);

  return nextVersion;
}

copyWhitelist();
bumpVersion();
