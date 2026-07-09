#!/usr/bin/env node
/**
 * Generates an auto-incrementing integer version number for the app and
 * writes it to the files used by the bundle and by Expo's native project
 * generation (app.json).
 *
 * The version is stored in version.json in the repository root. Each CI build
 * increments it by one. The resulting value is used as:
 *   - the visible version label in the app header,
 *   - the Android versionCode,
 *   - the iOS buildNumber.
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../version.json');
const APP_JSON_FILE = path.resolve(__dirname, '../app.json');
const BUILD_INFO_FILE = path.resolve(__dirname, '../src/build-info/build-info.json');
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

  // Update app.json so Expo uses the same value for Android versionCode and iOS buildNumber.
  const appJson = readJson(APP_JSON_FILE, { expo: {} });
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.ios = appJson.expo.ios || {};
  appJson.expo.android.versionCode = nextVersion;
  appJson.expo.ios.buildNumber = String(nextVersion);
  writeJson(APP_JSON_FILE, appJson);
  console.log(`Updated app.json: Android versionCode=${nextVersion}, iOS buildNumber=${nextVersion}`);

  // Keep the in-bundle build-info for the header label.
  writeJson(BUILD_INFO_FILE, {
    buildNumber: String(nextVersion),
    generatedAt: new Date().toISOString(),
  });
  console.log(`Updated build-info.json: ${nextVersion}`);

  return nextVersion;
}

copyWhitelist();
bumpVersion();
