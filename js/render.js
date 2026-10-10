// Renders the tracker windows. Countdowns are spans with data-until / data-since that
// updateCountdowns() refreshes every second without re-rendering the tables.
import {HISTORY_DAYS} from './config.js';
import {state, D} from './store.js';
import {dayStats, payoutsOf, srpStatus, srpRecipient} from './analysis.js';
import {$, $$, esc, isk, short, utcDay, evTime, evStamp, dur, portrait} from './format.js';

const dim = s => `<span class="dimt">${s}</span>`;
const until = ts => `<span data-until="${ts}"></span>`;
const signed = v => `<span class="${v > 0 ? 'pos' : v < 0 ? 'neg' : 'dimt'}">${v ? isk(v) : '–'}</span>`;
const allIds = () => state.chars.map(c => c.id);
const today = () => utcDay(Date.now());
// The day shown in the income and payouts windows
const viewDay = () => state.selDay || today();
const dayLabel = d => d === today() ? 'today' : d.replace(/-/g, '.');

function pilotCell(c) {
    const st = c.bad || state.errs[c.id] ? 'bad' : state.busy.has(c.id) ? 'busy' : D(c.id).jAt ? 'ok' : '';
    return `<div class="pilot ${st}"><span class="dot"></span><img src="${portrait(c.id)}" alt="" loading="lazy"><span>${esc(c.name)}</span></div>`;
}

export function renderToday() {
    const {chars, busy} = state, day = viewDay(), isToday = day === today();
    $('#todayDate').textContent = 'EVE ' + new Date().toISOString().slice(11, 16);
    $('#dayTitle').textContent = dayLabel(day);
    $('#tNetLbl').textContent = isToday ? 'Net today' : 'Net';
    $('#backToday').hidden = isToday;
    const tot = dayStats(allIds(), day);
    $('#tNet').textContent = isk(tot.net);
    $('#tSites').textContent = tot.sites;
    $('#tGross').textContent = isk(tot.gross);
    $('#tTax').textContent = isk(tot.tax);
    const balSum = chars.reduce((a, c) => a + (D(c.id).bal || 0), 0);

    $('#todayTbl tbody').innerHTML = chars.length ? chars.map(c => {
        const s = dayStats([c.id], day), d = D(c.id);
        const next = c.bad ? '<span class="neg">login expired</span>' : busy.has(c.id) ? 'reading…' : until(Math.min(d.nextJ, d.nextB));
        return `<tr><td>${pilotCell(c)}</td><td class="num">${s.sites || dim(0)}</td>
      <td class="num">${signed(s.gross)}</td><td class="num">${signed(s.tax)}</td>
      <td class="num ${s.net ? 'gold' : 'dimt'}">${s.net ? isk(s.net) : '–'}</td>
      <td class="num">${s.last ? evTime(s.last) : dim('–')}</td>
      <td class="num">${d.bal == null ? dim('–') : isk(d.bal)}</td>
      <td class="num small">${next}</td></tr>`;
    }).join('') : `<tr><td class="empty" colspan="8">No characters yet. <a href="#" data-act="login">Log in with EVE Online</a> to start tracking.</td></tr>`;

    $('#todayTbl tfoot').innerHTML = chars.length > 1 ? `<tr><td>Total</td><td class="num">${tot.sites}</td><td class="num">${isk(tot.gross)}</td>
      <td class="num">${isk(tot.tax)}</td><td class="num gold">${isk(tot.net)}</td><td></td><td class="num">${isk(balSum)}</td><td></td></tr>` : '';
    // header and tab title always show today, whichever day is selected
    const now = isToday ? tot : dayStats(allIds(), today());
    $('#ticker').innerHTML = `Today <b class="g">${isk(now.net)}</b> · ${now.sites} sites · wallets <b>${isk(balSum)}</b>`;
    document.title = now.net ? `${short(now.net)} · Incursion Tracker` : 'Incursion Tracker';
}

function renderPayouts() {
    const day = viewDay();
    $('#payoutTitle').textContent = dayLabel(day);
    const list = state.chars.flatMap(c => payoutsOf(c.id, day).map(p => ({c, ...p})))
        .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.id - a.e.id);
    $('#payoutCount').textContent = list.length ? `${list.length} payouts` : '';
    $('#payoutTbl tbody').innerHTML = list.length ? list.map(({c, e, tax, bal}) => `<tr>
      <td>${evTime(e.date)}</td><td>${esc(c.name)}</td><td class="num pos">${isk(e.a)}</td><td class="num neg">${tax ? isk(tax) : '–'}</td>
      <td class="num gold">${isk(e.a + tax)}</td><td class="num small">${isk(bal)}</td></tr>`).join('')
        : `<tr><td class="empty" colspan="6">${day === today() ? 'No CONCORD payouts today yet.' : 'No CONCORD payouts on this day.'}</td></tr>`;
}

export function renderWeek() {
    const sel = $('#weekChar'), cur = sel.value;
    sel.innerHTML = `<option value="">All pilots</option>` + state.chars.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    sel.value = state.chars.some(c => String(c.id) === cur) ? cur : '';
    const ids = sel.value ? [+sel.value] : allIds(), now = Date.now();
    const days = Array.from({length: HISTORY_DAYS}, (_, i) => {
        const day = utcDay(now - i * 864e5);
        return {day, s: dayStats(ids, day)};
    });
    const max = Math.max(1, ...days.map(d => d.s.net));
    const sum = days.reduce((a, d) => ({net: a.net + d.s.net, sites: a.sites + d.s.sites}), {net: 0, sites: 0});
    $('#weekSum').textContent = `${sum.sites} sites · ${isk(sum.net)}`;
    const shown = viewDay();
    $('#weekTbl tbody').innerHTML = days.map(({
                                                  day,
                                                  s
                                              }, i) => `<tr data-day="${day}" class="${i === 0 ? 'today' : ''} ${day === shown ? 'sel' : ''}">
      <td>${day.replace(/-/g, '.')} ${dim(new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC'
    }))}</td>
      <td class="num">${s.sites || dim(0)}</td><td class="num">${s.gross ? isk(s.gross) : dim('–')}</td>
      <td class="num">${s.tax ? isk(s.tax) : dim('–')}</td><td class="num ${s.net ? 'gold' : 'dimt'}">${s.net ? isk(s.net) : '–'}</td>
      <td><div class="wbar"><i style="width:${(Math.max(0, s.net) / max * 100).toFixed(1)}%"></i></div></td></tr>`).join('');
}

const SRP_LABEL = {ok: 'Valid', soon: 'Expiring', expired: 'Expired', none: 'Not paid'};

export function renderSrp() {
    const {cfg, chars} = state;
    const who = srpRecipient();
    $('#srpTip').dataset.tip = `Looks for the latest <b>Player Donation</b> to <b>${esc(who || 'the SRP recipient set in Settings')}</b>` +
        `${+cfg.srpMin ? ` of at least ${esc(cfg.srpMin)}M ISK` : ''}. It is valid for ${esc(cfg.srpHours)} hours after the payment.` +
        `<br><br>The journal is cached by ESI for up to an hour, so a fresh payment may take that long to show up here. Change the rule under Settings.`;
    if (!who) {
        $('#srpList').innerHTML = '<div class="small">Set the SRP recipient (e.g. your incursion community\'s SRP corporation) under <a href="#settings" data-act="settings">Settings</a> to track SRP payments.</div>';
        return;
    }
    if (!chars.length) {
        $('#srpList').innerHTML = '<div class="small">Add a character to see its SRP status.</div>';
        return;
    }
    $('#srpList').innerHTML = chars.map(c => {
        const s = srpStatus(c.id);
        const sub = s.p ? `${isk(-s.p.a)} · ${evStamp(s.paid)} → ${evStamp(s.until)}`
            : D(c.id).jAt ? `No payment to ${esc(who)} in the journal` : 'Waiting for first read…';
        const cd = !s.p ? '' : s.left > 0 ? `${until(s.until)}<div class="small">left</div>` : `<span data-since="${s.until}"></span><div class="small">ago</div>`;
        return `<div class="srp ${s.state}">
      <img src="${portrait(c.id)}" alt="" loading="lazy">
      <div class="nm">${esc(c.name)}</div><div class="st">${SRP_LABEL[s.state]}</div>
      <div class="sub" title="${esc(s.p?.desc || '')}">${sub}</div><div class="cd">${cd}</div>
      ${s.p ? `<div class="barw"><i style="width:${(s.frac * 100).toFixed(1)}%"></i></div>` : ''}</div>`;
    }).join('');
}

function renderChars() {
    const {chars, errs} = state;
    $('#charCount').textContent = chars.length ? String(chars.length) : '';
    $('#charList').innerHTML = chars.length ? chars.map(c => {
        const d = D(c.id);
        const sub = c.bad ? '<span class="neg">Login expired – please re-authorise</span>'
            : errs[c.id] ? `<span class="neg">${esc(errs[c.id])}</span>`
                : d.jAt ? `Journal read ${new Date(d.jAt).toISOString().slice(11, 16)} EVE` : 'Not read yet';
        const action = c.bad ? `<button class="sm primary" data-act="login">Re-login</button>`
            : `<button class="wbtn" data-act="sync" data-id="${c.id}" title="Read now"><svg class="ic"><use href="#i-refresh"/></svg></button>`;
        return `<div class="charrow">
      <img src="${portrait(c.id)}" alt="" width="32" height="32" style="border:1px solid rgba(255,255,255,.14)" loading="lazy">
      <div class="grow"><div>${esc(c.name)}</div><div class="sub">${sub}</div></div>
      ${action}<button class="wbtn" data-act="remove" data-id="${c.id}" title="Remove"><svg class="ic"><use href="#i-trash"/></svg></button></div>`;
    }).join('') : '<div class="small">No characters logged in.</div>';
}

function renderLog() {
    const {events} = state;
    $('#log').innerHTML = events.length ? events.map(e => `<li><time>${evStamp(e.t)}</time><span class="lg-${e.kind}">${e.text}</span></li>`).join('')
        : '<li><span class="small">Nothing yet.</span></li>';
}

function renderLive() {
    const {chars, errs} = state, el = $('#live');
    el.classList.toggle('on', chars.some(c => D(c.id).jAt && !errs[c.id] && !c.bad));
    el.classList.toggle('bad', chars.some(c => errs[c.id] || c.bad));
    el.title = Date.now() < state.pauseUntil ? 'Paused (ESI error limit)'
        : chars.map(c => `${c.name}: ${c.bad ? 'login expired' : errs[c.id] || 'ok'}`).join('\n');
}

export function updateCountdowns() {
    const now = Date.now();
    for (const el of $$('[data-until]')) {
        const ms = +el.dataset.until - now;
        el.textContent = ms > 0 ? dur(ms) : 'now';
    }
    for (const el of $$('[data-since]')) el.textContent = dur(now - +el.dataset.since);
}

export function render() {
    renderToday();
    renderPayouts();
    renderWeek();
    renderSrp();
    renderChars();
    renderLog();
    renderLive();
    updateCountdowns();
}

// Coalesces bursts of state changes into one render. A timer instead of requestAnimationFrame,
// so background tabs keep their title (today's income) up to date.
let queued = false;

export function scheduleRender() {
    if (queued) return;
    queued = true;
    setTimeout(() => {
        queued = false;
        render();
    }, 0);
}
