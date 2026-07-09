import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import {
  COMPOSE_URL,
  isAllowedTopLevelUrl,
  isXDomain,
  shouldAllowRequest,
} from './src/urlPolicy';

export default function App() {
  const webviewRef = useRef(null);
  const [blockedUrl, setBlockedUrl] = useState(null);

  const handleShouldStartLoadWithRequest = (request) => {
    const allowed = shouldAllowRequest(request);

    // If X tries to redirect to a disallowed X page (e.g. home timeline after
    // login), we silently send the user back to the composer.
    if (!allowed && request.isTopFrame !== false && isXDomain(request.url)) {
      redirectToCompose();
      return false;
    }

    if (!allowed && request.isTopFrame !== false) {
      setBlockedUrl(request.url);
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState) => {
    if (!navState.url) return;

    if (!isAllowedTopLevelUrl(navState.url)) {
      if (isXDomain(navState.url)) {
        redirectToCompose();
      } else {
        // External page: try to go back, then show the blocked message.
        if (webviewRef.current && navState.canGoBack) {
          webviewRef.current.goBack();
        } else {
          setBlockedUrl(navState.url);
        }
      }
    }
  };

  const redirectToCompose = () => {
    webviewRef.current?.injectJavaScript(
      `window.location.replace('${COMPOSE_URL}'); true;`
    );
  };

  const dismissBlockedMessage = () => {
    setBlockedUrl(null);
    redirectToCompose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Only Post on X</Text>
      </View>
      <View style={styles.webviewContainer}>
        <WebView
          ref={webviewRef}
          source={{ uri: COMPOSE_URL }}
          style={styles.webview}
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
            <Text style={styles.blockedButton} onPress={dismissBlockedMessage}>
              Back to composer
            </Text>
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
  },
  headerTitle: {
    color: '#e7e9ea',
    fontSize: 18,
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
