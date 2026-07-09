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
  isAllowedTopLevelUrl,
  isXDomain,
  shouldAllowRequest,
} from './src/urlPolicy';
import { BUILD_NUMBER } from './src/build-info';

export default function App() {
  const webviewRef = useRef(null);
  const [blockedUrl, setBlockedUrl] = useState(null);

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

    // Avoid auto-redirecting here: that causes a reload loop when X bounces
    // between login and composer while the user is not yet authenticated.
    if (!isAllowedTopLevelUrl(navState.url) && !isXDomain(navState.url)) {
      setBlockedUrl(navState.url);
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
