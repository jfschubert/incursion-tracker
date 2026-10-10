// Constants and the built-in ESI application.
//
// DEFAULT_CLIENT_ID is the Client ID of the ESI application registered for the hosted page
// (GitHub Pages). Its callback URL must be the page URL. A Client ID is not a secret: login
// uses PKCE, so the ID alone can only send users to the EVE SSO login page.
// When both are set, the page at DEFAULT_REDIRECT always uses this Client ID and hides the
// "ESI application" settings. Anywhere else (self-hosted, localhost) users enter their own.
export const DEFAULT_CLIENT_ID = '82c09a5a138643ae832cf1a137d2be59';
// The exact callback URL the built-in application is registered for, e.g.
// 'https://jfschubert.github.io/incursion-tracker/'
export const DEFAULT_REDIRECT = 'https://jfschubert.github.io/incursion-tracker/';

export const VERSION = '1.0.0';
export const LICENSE = 'GPL-3.0';
export const REPO_URL = 'https://github.com/jfschubert/incursion-tracker';

export const ESI = 'https://esi.evetech.net/latest';
export const SSO = 'https://login.eveonline.com/v2/oauth';
export const SCOPE = 'esi-wallet.read_character_wallet.v1';
export const REF = {PAY: 'corporate_reward_payout', TAX: 'corporate_reward_tax', DON: 'player_donation'};
export const KEEP_DAYS = 35;
export const HISTORY_DAYS = 14;
// Fallback cache lifetimes if the Expires header is not readable. The browser cache still
// honours the real Expires, so reading early never hits ESI before the data changes.
export const FALLBACK_J = 300e3;
export const FALLBACK_B = 120e3;

export const redirectUri = location.origin + location.pathname.replace(/index\.html$/, '');
