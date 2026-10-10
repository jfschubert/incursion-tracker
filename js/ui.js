// Toasts, event log, desktop notifications, pages, collapsible windows and tooltips.
import {$, $$} from './format.js';
import {state, LS, saveEvents, changed} from './store.js';

export function toast(html, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = html;
    $('#toasts').append(el);
    setTimeout(() => el.remove(), kind === 'err' ? 9000 : 5000);
}

// `html` must already be escaped.
export function log(html, kind = 'info') {
    state.events.unshift({t: Date.now(), text: html, kind});
    state.events = state.events.slice(0, 150);
    saveEvents();
    changed();
}

export function notify(title, body) {
    if (!state.cfg.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(title, {body, icon: 'icon.svg'});
    } catch {
    }
}

// Pages: Tracker / Settings / About (remembered, also linkable via #settings or #about)
export function showPage(p) {
    if (!document.querySelector(`main[data-page="${p}"]`)) p = 'tracker';
    $$('.page').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    $$('main[data-page]').forEach(m => m.hidden = m.dataset.page !== p);
    LS.set('itrk.page', p);
    if (location.hash.slice(1) !== p) history.replaceState(null, '', p === 'tracker' ? location.pathname : '#' + p);
    $('#tip').style.display = 'none';
}

export const startPage = () => location.hash.slice(1) || LS.get('itrk.page', 'tracker');

export function bindChrome() {
    $$('.page').forEach(b => b.onclick = () => showPage(b.dataset.page));

    const ui = LS.get('itrk.ui', {collapsed: []});
    for (const w of $$('.win[data-win]')) {
        if (ui.collapsed.includes(w.dataset.win)) w.classList.add('collapsed');
        const btn = w.querySelector('[data-collapse]');
        if (btn) btn.onclick = () => {
            w.classList.toggle('collapsed');
            ui.collapsed = $$('.win.collapsed').map(x => x.dataset.win);
            LS.set('itrk.ui', ui);
        };
    }

    const tip = $('#tip');
    const showTip = el => {
        tip.innerHTML = el.dataset.tip;
        tip.style.display = 'block';
        const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
        tip.style.left = Math.max(8, Math.min(innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
        tip.style.top = (r.bottom + th + 12 > innerHeight ? r.top - th - 8 : r.bottom + 8) + 'px';
    };
    document.addEventListener('mouseover', e => {
        const el = e.target.closest('.info[data-tip]');
        if (el) showTip(el);
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('.info[data-tip]')) tip.style.display = 'none';
    });
    document.addEventListener('focusin', e => {
        const el = e.target.closest('.info[data-tip]');
        if (el) showTip(el);
    });
    document.addEventListener('focusout', () => tip.style.display = 'none');
}
