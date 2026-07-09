/**
 * URL policy for the locked-down X browser.
 *
 * The app is intentionally minimal: it can only log in to X and open the
 * post composer. Everything else (timeline, profiles, explore, external
 * links, etc.) is blocked.
 *
 * The allowed paths are loaded from a bundled whitelist at startup and can be
 * refreshed from a remote whitelist file in the repository.
 */

import bundledWhitelist from './whitelist/whitelist.json';

export const COMPOSE_URL = 'https://x.com/compose/post';

// Raw GitHub URL for the latest whitelist in the main branch.
const REMOTE_WHITELIST_URL =
  'https://raw.githubusercontent.com/resname/only-post-on-x-browser/main/url-whitelist.json';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let currentWhitelist = normalizeWhitelist(bundledWhitelist);

function normalizeWhitelist(raw) {
  return {
    xDomains: new Set(raw.xDomains || []),
    authDomains: new Set(raw.authDomains || []),
    allowedPaths: raw.allowedPaths || [],
    blockedPaths: new Set(raw.blockedPaths || []),
  };
}

export async function refreshWhitelist() {
  try {
    const response = await fetch(REMOTE_WHITELIST_URL, {
      method: 'GET',
      cache: 'no-cache',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    currentWhitelist = normalizeWhitelist(json);
    return currentWhitelist;
  } catch (error) {
    // Keep using the bundled whitelist if the remote fetch fails.
    console.warn('Failed to refresh whitelist:', error.message);
    return currentWhitelist;
  }
}

export function startWhitelistRefreshLoop() {
  refreshWhitelist();
  setInterval(refreshWhitelist, REFRESH_INTERVAL_MS);
}

function hostnameMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

export function isXDomain(url) {
  const host = getHostname(url);
  return Array.from(currentWhitelist.xDomains).some((domain) =>
    hostnameMatches(host, domain)
  );
}

export function isAuthProvider(url) {
  const host = getHostname(url);
  return Array.from(currentWhitelist.authDomains).some((domain) =>
    hostnameMatches(host, domain)
  );
}

export function isBlockedPath(url) {
  const path = getPathname(url);
  return currentWhitelist.blockedPaths.has(path);
}

export function isAllowedXPage(url) {
  if (!isXDomain(url)) return false;
  const path = getPathname(url);
  if (isBlockedPath(url)) return false;
  return currentWhitelist.allowedPaths.some(
    (allowed) => path === allowed || path.startsWith(allowed)
  );
}

/**
 * Decide whether a WebView load request should be allowed.
 *
 * @param {import('react-native-webview').WebViewNavigation} request
 * @returns {boolean}
 */
export function shouldAllowRequest(request) {
  const { url, isTopFrame } = request;

  // Sub-resources (images, scripts, XHR, etc.) keep the current page working.
  if (isTopFrame === false) {
    return isXDomain(url) || isAuthProvider(url);
  }

  // Top-level SSO provider pages are required for sign-in.
  if (isAuthProvider(url)) return true;

  // Top-level X pages are only allowed if they are part of login or compose.
  return isAllowedXPage(url);
}

/**
 * Decide whether the currently displayed top-level URL is allowed.
 * Used after the fact to redirect the user back to the composer if X tries
 * to send them to the home timeline or another page.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedTopLevelUrl(url) {
  if (isAuthProvider(url)) return true;
  return isAllowedXPage(url);
}
