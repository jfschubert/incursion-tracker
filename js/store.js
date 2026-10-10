// Persistent state (localStorage) and a tiny change notification.
import {DEFAULT_CLIENT_ID, DEFAULT_REDIRECT, redirectUri} from './config.js';

export const LS = {
    get(k, d) {
        try {
            const v = localStorage.getItem(k);
            return v ? JSON.parse(v) : d;
        } catch {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem(k, JSON.stringify(v));
        } catch {
        }
    },
    del(k) {
        try {
            localStorage.removeItem(k);
        } catch {
        }
    },
};
export const KEYS = ['itrk.cfg', 'itrk.chars', 'itrk.data', 'itrk.names', 'itrk.log', 'itrk.ui', 'itrk.page'];

export const state = {
    cfg: Object.assign({
        clientId: '',
        srpName: '',
        srpHours: 24,
        srpMin: 0,
        warnMin: 60,
        notify: false
    }, LS.get('itrk.cfg', {})),
    chars: LS.get('itrk.chars', []),   // [{id, name, access, refresh, exp, bad}]
    data: LS.get('itrk.data', {}),     // id -> {entries:{id:e}, bal, nextJ, nextB, jAt, init}
    names: LS.get('itrk.names', {}),   // entity id -> name
    events: LS.get('itrk.log', []),
    busy: new Set(),                   // character ids being read right now
    errs: {},                          // character id -> last error message
    pauseUntil: 0,                     // ESI error-limit back-off
    selDay: null,                      // day picked in the 14-day table (YYYY-MM-DD), null = today
};

export const saveCfg = () => LS.set('itrk.cfg', state.cfg);
export const saveChars = () => LS.set('itrk.chars', state.chars);
export const saveData = () => LS.set('itrk.data', state.data);
export const saveNames = () => LS.set('itrk.names', state.names);
export const saveEvents = () => LS.set('itrk.log', state.events);

export const emptyData = () => ({entries: {}, bal: null, nextJ: 0, nextB: 0, jAt: 0, init: false});
export const D = id => (state.data[id] ??= emptyData());
export const entriesOf = id => Object.values(D(id).entries);
export const charName = id => state.chars.find(c => c.id === id)?.name || String(id);

// On the hosted page (the URL the built-in application is registered for) the built-in Client ID
// is always used and the ESI application settings are hidden; everywhere else the user's own.
export const builtinUsable = () => !!DEFAULT_CLIENT_ID && DEFAULT_REDIRECT === redirectUri;
export const clientId = () => builtinUsable() ? DEFAULT_CLIENT_ID : state.cfg.clientId;

const listeners = new Set();
export const onChange = fn => listeners.add(fn);
export const changed = () => listeners.forEach(fn => fn());
