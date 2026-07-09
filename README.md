# Only Post on X

A minimal iOS/Android app that can log in to X and open the post composer — and nothing else. It is essentially a locked-down browser built with Expo and React Native.

## What it does

- Opens `https://x.com/compose/post`.
- Allows the X login, signup, and password-reset flows.
- Allows Google and Apple single-sign-in pages that X uses.
- Blocks the timeline, profiles, explore, external links, and any other X pages.
- Redirects the user back to the composer if X tries to send them to the home feed after login.

## Why

If you want to post on X without the distraction of scrolling, this app removes the browse button. It keeps only the flow needed to authenticate and write a post.

## Tech stack

- [Expo](https://expo.dev)
- [React Native](https://reactnative.dev)
- [react-native-webview](https://github.com/react-native-webview/react-native-webview)

## Project structure

```
.
├── App.js                 # Main screen: header + locked-down WebView
├── src/
│   └── urlPolicy.js       # Allowed/blocked URL rules
├── app.json               # Expo app config
├── assets/                # App icons and splash screen
├── .github/workflows/     # GitHub Actions CI/CD
├── package.json
├── babel.config.js
└── eas.json               # EAS Build profiles
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

If you do not have the Expo CLI installed globally, `npx expo` commands below will use the locally installed copy automatically.

### 2. Start the development server

```bash
npx expo start
```

### 3. Run on a simulator or device

Press `i` in the Expo CLI to open on an iOS simulator, or `a` for an Android emulator.

Or run directly:

```bash
npx expo run:ios
npx expo run:android
```

> The first native build will take several minutes and may require Xcode (macOS) or Android Studio.

## Building production binaries

### With EAS Build (recommended)

Install EAS CLI if needed:

```bash
npm install -g eas-cli
```

Configure the project:

```bash
eas init
```

Build locally:

```bash
eas build --platform ios
eas build --platform android
```

### With GitHub Actions

The repository includes a workflow that builds both iOS and Android apps automatically on every push to `main` and on pull requests.

1. Create an Expo access token:

   ```bash
   eas login
   eas token:create
   ```

2. Add it as a repository secret named `EXPO_TOKEN`:

   ```bash
   gh secret set EXPO_TOKEN
   ```

   Or set it via the GitHub web UI: **Settings > Secrets and variables > Actions > New repository secret**.

3. Push to `main` or open a pull request. GitHub Actions will trigger EAS builds and post them to the [Expo dashboard](https://expo.dev).

### Locally

Generate native projects:

```bash
npx expo prebuild
```

Then open `ios/` in Xcode or `android/` in Android Studio to build and sign release binaries.

## Customizing the allowed URLs

All URL rules live in `src/urlPolicy.js`. To allow another page (for example, an additional SSO provider), add its domain to `AUTH_DOMAINS` or its X path to `ALLOWED_X_PATHS`.

## Notes and caveats

- X may change its web routes at any time. If a login page stops working, check `src/urlPolicy.js` and add the new path.
- EAS builds for iOS require an Apple Developer account and proper credentials configured in Expo.
- The GitHub Actions workflow queues builds with `--no-wait`. Monitor build status on the [Expo dashboard](https://expo.dev).
- This is not an official X/Twitter app and is not affiliated with X Corp.

## License

See [LICENSE](./LICENSE).
