// Incursion Tracker – entry point: wiring, timers and SRP alerts.
import {state, saveChars, saveData, saveEvents, onChange, clientId} from './store.js';
import {$, esc, dur, utcDay} from './format.js';
import {bindChrome, showPage, startPage, toast, log, notify} from './ui.js';
import {login, handleCallback} from './sso.js';
import {sync, syncAll} from './esi.js';
import {srpStatus} from './analysis.js';
import {render, scheduleRender, renderToday, renderSrp, renderWeek, updateCountdowns} from './render.js';
import {bindSettings} from './settings.js';
import {bindAbout} from './about.js';

// SRP alert flags per payment, so each warning fires once
const alerted = {};
const resetAlerts = () => {
    for (const k in alerted) delete alerted[k];
};

function checkSrpAlerts() {
    for (const c of state.chars) {
        const s = srpStatus(c.id);
        if (!s.p) continue;
        // a payment that is already expiring/expired when first seen does not alert
        const a = alerted[c.id + ':' + s.p.id] ??= {soon: s.state !== 'ok', expired: s.state === 'expired'};
        if (s.state === 'soon' && !a.soon) {
            a.soon = true;
            renderSrp();
            const msg = `SRP expires in ${dur(s.left)}`;
            log(`${esc(c.name)}: ${msg}`, 'warn');
            toast(`<b>${esc(c.name)}</b>: ${msg}`, 'warn');
            notify('SRP expiring', `${c.name}: ${msg}`);
        }
        if (s.state === 'expired' && !a.expired) {
            a.expired = a.soon = true;
            renderSrp();
            log(`${esc(c.name)}: SRP expired`, 'err');
            toast(`<b>${esc(c.name)}</b>: SRP expired`, 'err');
            notify('SRP expired', `${c.name}: SRP coverage has expired`);
        }
    }
}

let lastDay = utcDay(Date.now()), lastMinute = '';

function secondTick() {
    const now = Date.now(), day = utcDay(now), minute = new Date(now).toISOString().slice(0, 16);
    if (day !== lastDay) {
        lastDay = day;
        log('New EVE day – daily counters reset');
    } else if (minute !== lastMinute) {
        lastMinute = minute;
        renderToday();
        renderSrp();
    }
    updateCountdowns();
    checkSrpAlerts();
}

function bindActions() {
    $('#addChar').onclick = $('#addChar2').onclick = login;
    $('#syncAll').onclick = () => syncAll(true);
    $('#clearLog').onclick = () => {
        state.events = [];
        saveEvents();
        render();
    };
    $('#weekChar').onchange = renderWeek;
    // pick a day in the 14-day table; clicking the selected day again goes back to today
    $('#weekTbl tbody').onclick = e => {
        const tr = e.target.closest('tr[data-day]');
        if (!tr) return;
        const day = tr.dataset.day;
        state.selDay = day === utcDay(Date.now()) || day === state.selDay ? null : day;
        render();
    };
    $('#backToday').onclick = () => {
        state.selDay = null;
        render();
    };
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        e.preventDefault();
        const c = state.chars.find(x => x.id === +b.dataset.id);
        if (b.dataset.act === 'login') login();
        else if (b.dataset.act === 'settings') {
            showPage('settings');
            $('#srpName').focus();
        } else if (b.dataset.act === 'sync' && c) sync(c, true);
        else if (b.dataset.act === 'remove' && c && confirm(`Remove ${c.name} and its stored token?`)) {
            state.chars = state.chars.filter(x => x !== c);
            delete state.data[c.id];
            saveChars();
            saveData();
            log(`${esc(c.name)} removed`);
        }
    });
}

onChange(scheduleRender);
bindChrome();
bindSettings(resetAlerts);
bindActions();
bindAbout();
render();
// before showPage: it rewrites the URL, which would drop the SSO's ?code=…
await handleCallback();
showPage(clientId() ? startPage() : 'settings');
render();
syncAll();
setInterval(syncAll, 5000);
setInterval(secondTick, 1000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        render();
        syncAll();
    }
});
