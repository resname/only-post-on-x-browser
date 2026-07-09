/**
 * URL policy for the locked-down X browser.
 *
 * The app is intentionally minimal: it can only log in to X and open the
 * post composer. Everything else (timeline, profiles, explore, external
 * links, etc.) is blocked.
 */

export const COMPOSE_URL = 'https://x.com/compose/post';

// X/Twitter domains used for visible pages and API calls.
const X_DOMAINS = new Set([
  'x.com',
  'twitter.com',
  'api.x.com',
  'api.twitter.com',
  'abs.twimg.com',
  'pbs.twimg.com',
  'video.twimg.com',
  'ton.twimg.com',
  'cdn.syndication.twimg.com',
]);

// Third-party login providers X uses for SSO.
const AUTH_DOMAINS = new Set([
  'accounts.google.com',
  'appleid.apple.com',
  'idmsa.apple.com',
  'login.live.com',
  'www.facebook.com',
]);

// Allowed visible page paths on x.com / twitter.com.
const ALLOWED_X_PATHS = [
  '/compose/post',
  '/login',
  '/logout',
  '/i/flow/login',
  '/i/flow/signup',
  '/i/flow/password_reset',
  '/i/flow/add_username',
  '/i/flow/confirm_email',
  '/i/flow/account',
  '/i/flow/sso',
  '/i/flow/single_sign_on',
  '/i/flow/2fa',
  '/i/flow/verify',
  '/i/flow/enter_password',
  '/i/oauth2/',
  '/auth/',
  '/oauth/',
  '/account/begin_password_reset',
  '/account/access',
];

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

function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

export function isXDomain(url) {
  const host = getHostname(url);
  return Array.from(X_DOMAINS).some((domain) => hostnameMatches(host, domain));
}

export function isAuthProvider(url) {
  const host = getHostname(url);
  return Array.from(AUTH_DOMAINS).some((domain) => hostnameMatches(host, domain));
}

export function isAllowedXPage(url) {
  if (!isXDomain(url)) return false;
  const path = getPathname(url);
  return ALLOWED_X_PATHS.some((allowed) =>
    path === allowed || path.startsWith(allowed)
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
