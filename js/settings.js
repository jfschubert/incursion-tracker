// Settings page: ESI application, SRP rule, stored data.
import {redirectUri, DEFAULT_CLIENT_ID} from './config.js';
import {state, KEYS, LS, emptyData, saveCfg, saveData, builtinUsable, changed} from './store.js';
import {$} from './format.js';
import {toast} from './ui.js';

export function bindSettings(onRuleChange) {
    const {cfg} = state;
    $('#cbUrl').textContent = redirectUri;
    if (location.protocol === 'file:')
        $('#protoMsg').innerHTML = `<div class="msg err" style="margin-bottom:10px">This page is opened as a local file. EVE SSO can't redirect back to <code>file://</code>.
      Serve the folder instead, e.g. <code>python -m http.server 8080</code>, then open <code>http://localhost:8080/</code>.</div>`;
    if (builtinUsable()) {
        $('.win[data-win="app"]').hidden = true;
    } else if (DEFAULT_CLIENT_ID) {
        $('#protoMsg').insertAdjacentHTML('beforeend', `<div class="msg warn" style="margin-bottom:10px">The built-in ESI application only works on the hosted page. Here you need your own.</div>`);
    }

    const fields = {
        clientId: 'value',
        srpName: 'value',
        srpHours: 'value',
        srpMin: 'value',
        warnMin: 'value',
        notify: 'checked'
    };
    for (const [k, prop] of Object.entries(fields)) {
        const el = $('#' + k);
        el[prop] = cfg[k];
        el.addEventListener('change', async () => {
            let v = el[prop];
            if (el.type === 'number') v = Math.max(0, +v || 0);
            if (k === 'srpHours' && !v) v = 24;
            if (k === 'clientId') v = v.trim();
            if (k === 'notify' && v && 'Notification' in window && Notification.permission !== 'granted') {
                if (await Notification.requestPermission() !== 'granted') {
                    v = false;
                    el.checked = false;
                    toast('Notifications were blocked by the browser.', 'warn');
                }
            }
            cfg[k] = v;
            saveCfg();
            onRuleChange();
            changed();
        });
    }

    $('#cbCopy').onclick = () => navigator.clipboard?.writeText(redirectUri).then(() => toast('Callback URL copied', 'ok'));
    $('#clearJournal').onclick = () => {
        for (const id in state.data) state.data[id] = emptyData();
        saveData();
        changed();
        toast('Journal cache cleared – re-reading', 'ok');
    };
    $('#clearAll').onclick = () => {
        if (!confirm('Remove all characters, tokens, settings and cached journal data from this browser?')) return;
        KEYS.forEach(k => LS.del(k));
        location.reload();
    };
}
