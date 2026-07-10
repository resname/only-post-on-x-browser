// Expo config plugin that wires the generated Android release build to a
// real release keystore supplied via environment variables. Without this,
// `bundleRelease` uses the debug keystore and Play Store rejects the AAB.
//
// Expected environment variables (set in CI / GitHub Actions):
//   ANDROID_RELEASE_STORE_FILE     absolute path to the keystore file
//   ANDROID_RELEASE_STORE_PASSWORD keystore password
//   ANDROID_RELEASE_KEY_ALIAS      key alias
//   ANDROID_RELEASE_KEY_PASSWORD   key password
//
// If the keystore file is missing, the build falls back to the debug keystore
// so local development builds keep working.

const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;

    // Only patch once.
    if (gradle.includes('releaseSigningFromEnv')) {
      return config;
    }

    // Find the existing signingConfigs block and append a release config that
    // reads from environment variables / gradle project properties.
    const signingConfigsMatch = gradle.match(/signingConfigs\s*\{[\s\S]*?\n    \}/);
    if (!signingConfigsMatch) {
      console.warn('android-release-signing plugin: could not locate signingConfigs block');
      return config;
    }

    const releaseConfig = `
        release {
            storeFile file(System.getenv('ANDROID_RELEASE_STORE_FILE') ?: project.properties.get('ANDROID_RELEASE_STORE_FILE', 'debug.keystore'))
            storePassword System.getenv('ANDROID_RELEASE_STORE_PASSWORD') ?: project.properties.get('ANDROID_RELEASE_STORE_PASSWORD', 'android')
            keyAlias System.getenv('ANDROID_RELEASE_KEY_ALIAS') ?: project.properties.get('ANDROID_RELEASE_KEY_ALIAS', 'androiddebugkey')
            keyPassword System.getenv('ANDROID_RELEASE_KEY_PASSWORD') ?: project.properties.get('ANDROID_RELEASE_KEY_PASSWORD', 'android')
        }`;

    const patchedSigning = signingConfigsMatch[0].replace(
      /\n    \}$/,
      `${releaseConfig}\n    }`
    );

    gradle = gradle.replace(signingConfigsMatch[0], patchedSigning);

    // Point the release buildType at the new release signing config, leaving
    // the debug buildType untouched. Anchor to the buildTypes block so we do
    // not accidentally match the release signing config added above.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
      '$1signingConfigs.release'
    );

    config.modResults.contents = gradle;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
