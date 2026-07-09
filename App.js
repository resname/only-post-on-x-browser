import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import {
  COMPOSE_URL,
  getPathname,
  isAllowedTopLevelUrl,
  isXDomain,
  shouldAllowRequest,
  startWhitelistRefreshLoop,
} from './src/urlPolicy';
import { BUILD_NUMBER } from './src/build-info';

// Keep the user inside the composer: hide the X back arrow and block
// navigation to the timeline when the user is on /compose/post.
// We deliberately do NOT override history.back, because X uses it to close
// modals such as the GIF picker.
const COMPOSE_LOCK_SCRIPT = `
(function() {
  function hideTimelineBackButton() {
    const selectors = [
      '[data-testid="app-bar-back"]',
      'a[href="/home"]',
      'a[href="/"]',
      'a[href^="/home?"]',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if ((el.getAttribute('href') || '').startsWith('/home') || el.getAttribute('href') === '/') {
          el.style.display = 'none';
          el.style.pointerEvents = 'none';
        }
      });
    });
  }

  function blockTimelineNavigation(e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === '/home' || href === '/' || href.startsWith('/home?')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  if (location.pathname === '/compose/post') {
    hideTimelineBackButton();
    document.addEventListener('click', blockTimelineNavigation, true);
    const observer = new MutationObserver(hideTimelineBackButton);
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
true;
`;

// Use a current mobile Chrome user agent so X treats this as a real browser
// and shows all login options (Google, phone/email, Apple).
const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export default function App() {
  const webviewRef = useRef(null);
  const [blockedUrl, setBlockedUrl] = useState(null);

  // Start fetching the remote whitelist periodically.
  startWhitelistRefreshLoop();

  const handleShouldStartLoadWithRequest = (request) => {
    const allowed = shouldAllowRequest(request);

    if (!allowed && request.isTopFrame !== false) {
      // Silently block disallowed X pages so the login flow is not interrupted
      // by forced redirects back to the composer.
      if (!isXDomain(request.url)) {
        setBlockedUrl(request.url);
      }
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState) => {
    if (!navState.url) return;

    if (!isAllowedTopLevelUrl(navState.url)) {
      if (isXDomain(navState.url)) {
        // If the user clicks the X back arrow to leave the composer, send them
        // back to the composer instead of letting them access the timeline.
        const path = getPathname(navState.url);
        if (path === '/' || path === '/home') {
          redirectToCompose();
        }
      } else {
        setBlockedUrl(navState.url);
      }
    }
  };

  const redirectToCompose = () => {
    setBlockedUrl(null);
    webviewRef.current?.injectJavaScript(
      `window.location.replace('${COMPOSE_URL}'); true;`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Only Post on X</Text>
          <Text style={styles.buildNumber}>build {BUILD_NUMBER}</Text>
        </View>
        <TouchableOpacity onPress={redirectToCompose}>
          <Text style={styles.headerButton}>Compose</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.webviewContainer}>
        <WebView
          ref={webviewRef}
          source={{ uri: COMPOSE_URL }}
          style={styles.webview}
          userAgent={MOBILE_USER_AGENT}
          injectedJavaScript={COMPOSE_LOCK_SCRIPT}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#1d9bf0" />
            </View>
          )}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          allowsBackForwardNavigationGestures={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
        />
        {blockedUrl && (
          <View style={styles.blockedOverlay}>
            <Text style={styles.blockedText}>This page is not allowed.</Text>
            <Text style={styles.blockedUrl} numberOfLines={1}>
              {blockedUrl}
            </Text>
            <TouchableOpacity onPress={redirectToCompose}>
              <Text style={styles.blockedButton}>Back to composer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2f3336',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#e7e9ea',
    fontSize: 18,
    fontWeight: '700',
  },
  buildNumber: {
    color: '#71767b',
    fontSize: 11,
    marginTop: 2,
  },
  headerButton: {
    color: '#1d9bf0',
    fontSize: 15,
    fontWeight: '700',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  blockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 24,
  },
  blockedText: {
    color: '#e7e9ea',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  blockedUrl: {
    color: '#71767b',
    fontSize: 14,
    marginBottom: 24,
  },
  blockedButton: {
    color: '#1d9bf0',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
