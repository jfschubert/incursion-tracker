// EVE SSO login with PKCE (no client secret) and token refresh.
import {SSO, SCOPE, redirectUri} from './config.js';
import {state, D, saveChars, clientId} from './store.js';
import {$, esc} from './format.js';
import {toast, log, showPage} from './ui.js';

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));

function jwt(t) {
    let p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    p += '='.repeat((4 - p.length % 4) % 4);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), c => c.charCodeAt(0))));
}

export async function login() {
    if (!clientId()) {
        toast('Enter your ESI Client ID first.', 'warn');
        showPage('settings');
        $('#clientId').focus();
        return;
    }
    if (!window.isSecureContext || !crypto.subtle) {
        toast('Login needs http://localhost or https:// – see Settings.', 'err');
        showPage('settings');
        return;
    }
    const verifier = rand(32), st = rand(16);
    const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    localStorage.setItem('itrk.pkce', JSON.stringify({verifier, state: st}));
    location.href = SSO + '/authorize?' + new URLSearchParams({
        response_type: 'code', redirect_uri: redirectUri, client_id: clientId(), scope: SCOPE,
        code_challenge: challenge, code_challenge_method: 'S256', state: st,
    });
}

async function tokenRequest(params) {
    const r = await fetch(SSO + '/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams(params),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const e = new Error(j.error_description || j.error || 'HTTP ' + r.status);
        e.fatal = j.error === 'invalid_grant' || j.error === 'invalid_client';
        throw e;
    }
    return j;
}

// Completes a login when the SSO redirected back with ?code=…&state=…
export async function handleCallback() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return;
    history.replaceState(null, '', redirectUri);
    const p = JSON.parse(localStorage.getItem('itrk.pkce') || 'null');
    localStorage.removeItem('itrk.pkce');
    if (q.has('error')) {
        toast('Login cancelled: ' + esc(q.get('error_description') || q.get('error')), 'warn');
        return;
    }
    if (!p || p.state !== q.get('state')) {
        toast('Login failed: state mismatch. Please try again.', 'err');
        return;
    }
    try {
        const t = await tokenRequest({
            grant_type: 'authorization_code',
            code: q.get('code'),
            client_id: clientId(),
            code_verifier: p.verifier
        });
        const claims = jwt(t.access_token);
        const id = +claims.sub.split(':')[2];
        const rec = {
            id,
            name: claims.name,
            access: t.access_token,
            refresh: t.refresh_token,
            exp: Date.now() + (t.expires_in - 60) * 1000,
            bad: false
        };
        const ex = state.chars.find(c => c.id === id);
        if (ex) Object.assign(ex, rec); else state.chars.push(rec);
        saveChars();
        D(id).nextJ = 0;
        D(id).nextB = 0;
        const what = ex ? 're-authorised' : 'added';
        log(`${esc(rec.name)} ${what}`, 'ok');
        toast(`<b>${esc(rec.name)}</b> ${what}`, 'ok');
    } catch (e) {
        toast('Login failed: ' + esc(e.message), 'err');
    }
}

const refreshing = {};

export function accessToken(c) {
    if (c.access && c.exp > Date.now()) return Promise.resolve(c.access);
    return refreshing[c.id] ??= (async () => {
        try {
            const t = await tokenRequest({
                grant_type: 'refresh_token',
                refresh_token: c.refresh,
                client_id: clientId()
            });
            c.access = t.access_token;
            c.exp = Date.now() + (t.expires_in - 60) * 1000;
            if (t.refresh_token) c.refresh = t.refresh_token;
            saveChars();
            return c.access;
        } catch (e) {
            if (e.fatal) {
                c.bad = true;
                saveChars();
                log(`${esc(c.name)}: login expired, please log in again`, 'err');
            }
            throw e;
        } finally {
            delete refreshing[c.id];
        }
    })();
}
