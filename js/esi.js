// ESI requests and the per-character read schedule (follows each route's cache expiry).
import {ESI, REF, KEEP_DAYS, HISTORY_DAYS, FALLBACK_J, FALLBACK_B} from './config.js';
import {state, D, saveData, saveNames, changed} from './store.js';
import {accessToken} from './sso.js';
import {isSrp} from './analysis.js';
import {esc, isk, short, utcDay} from './format.js';
import {toast, log, notify} from './ui.js';

async function esi(c, path, retry = true) {
    if (Date.now() < state.pauseUntil) throw new Error('ESI error limit reached, pausing');
    const tok = await accessToken(c);
    const r = await fetch(ESI + path, {headers: {Authorization: 'Bearer ' + tok}});
    if (r.headers.has('x-esi-error-limit-remain')) {
        const remain = +r.headers.get('x-esi-error-limit-remain');
        if (remain < 15) {
            state.pauseUntil = Date.now() + (+r.headers.get('x-esi-error-limit-reset') || 60) * 1000;
            log(`ESI error limit low (${remain}), pausing requests`, 'warn');
        }
    }
    if (r.status === 401 && retry) {
        c.exp = 0;
        return esi(c, path, false);
    }
    if (r.status === 420) {
        state.pauseUntil = Date.now() + 60e3;
        throw new Error('ESI error limited (420)');
    }
    if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'HTTP ' + r.status);
    }
    const exp = Date.parse(r.headers.get('expires') || '');
    return {json: await r.json(), expires: isNaN(exp) ? null : exp, pages: +r.headers.get('x-pages') || 1};
}

async function resolveNames(ids) {
    ids = [...new Set(ids)].filter(i => i && !(i in state.names));
    if (!ids.length) return;
    try {
        const r = await fetch(ESI + '/universe/names/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(ids)
        });
        if (!r.ok) return;
        for (const n of await r.json()) state.names[n.id] = n.name;
        saveNames();
    } catch {
    }
}

const RELEVANT = new Set(Object.values(REF));

async function syncJournal(c) {
    const d = D(c.id), now = Date.now(), cutoff = now - KEEP_DAYS * 864e5;
    const fresh = [];
    let page = 1, pages = 1, expires = null;
    do {
        const r = await esi(c, `/characters/${c.id}/wallet/journal/?page=${page}`);
        pages = r.pages;
        if (page === 1) expires = r.expires;
        for (const e of r.json) {
            if (!RELEVANT.has(e.ref_type)) continue;
            if (!(e.id in d.entries)) fresh.push(e);
            d.entries[e.id] = {
                id: e.id,
                date: e.date,
                t: e.ref_type,
                a: e.amount,
                b: e.balance,
                desc: e.description,
                sp: e.second_party_id
            };
        }
        // newest first: stop once the page reaches past the history window
        const last = r.json[r.json.length - 1];
        if (!last || Date.parse(last.date) < now - HISTORY_DAYS * 864e5) break;
    } while (++page <= Math.min(pages, 5));
    for (const [k, e] of Object.entries(d.entries)) if (Date.parse(e.date) < cutoff) delete d.entries[k];
    await resolveNames(Object.values(d.entries).filter(e => e.t === REF.DON).map(e => e.sp));
    d.jAt = now;
    d.nextJ = Math.max((expires || now + FALLBACK_J) + 3000, now + 30e3);
    if (d.init) announce(c, fresh);
    d.init = true;
}

function announce(c, fresh) {
    const today = utcDay(Date.now());
    for (const e of fresh.sort((a, b) => a.date.localeCompare(b.date))) {
        if (e.ref_type === REF.PAY && e.date.slice(0, 10) === today) {
            log(`${esc(c.name)}: site payout <span class="pos">+${short(e.amount)}</span>`, 'ok');
            toast(`<b>${esc(c.name)}</b> site payout <span class="pos">+${isk(e.amount)}</span>`, 'ok');
            notify('Incursion payout', `${c.name}: +${isk(e.amount)}`);
        } else if (e.ref_type === REF.DON && isSrp({a: e.amount, sp: e.second_party_id, desc: e.description})) {
            log(`${esc(c.name)}: SRP payment ${short(-e.amount)} found`, 'ok');
            toast(`<b>${esc(c.name)}</b> SRP paid (${isk(-e.amount)})`, 'ok');
        }
    }
}

async function syncBalance(c) {
    const d = D(c.id), now = Date.now();
    const r = await esi(c, `/characters/${c.id}/wallet/`);
    d.bal = r.json;
    d.nextB = Math.max((r.expires || now + FALLBACK_B) + 3000, now + 30e3);
}

// Reads whatever is due for one character; force re-reads now (the browser cache still applies).
export async function sync(c, force = false) {
    const {busy, errs} = state;
    if (c.bad || busy.has(c.id)) return;
    const d = D(c.id), now = Date.now();
    const doJ = force || now >= d.nextJ, doB = force || now >= d.nextB;
    if (!doJ && !doB) return;
    busy.add(c.id);
    changed();
    try {
        if (doJ) await syncJournal(c);
        if (doB) await syncBalance(c);
        delete errs[c.id];
    } catch (e) {
        if (errs[c.id] !== e.message) log(`${esc(c.name)}: ${esc(e.message)}`, 'err');
        errs[c.id] = e.message;
        d.nextJ = Math.max(d.nextJ, now + 120e3);
        d.nextB = Math.max(d.nextB, now + 120e3);
    } finally {
        busy.delete(c.id);
        saveData();
        changed();
    }
}

export const syncAll = (force = false) => state.chars.forEach(c => sync(c, force));
