// Daily incursion income and SRP status from the stored journal entries.
import {REF} from './config.js';
import {state, entriesOf} from './store.js';

// ISK a tax line took from the wallet (negative). Falls back to ESI's tax field if amount is empty.
const taxValue = t => t.a || -Math.abs(t.tx || 0);

// One day of one character: payouts, each paired with the corp tax line booked right after it,
// plus tax lines that matched no payout. Without a tax line, the payout's own tax field is used.
function pairDay(id, day) {
    const es = entriesOf(id).filter(e => e.date.slice(0, 10) === day);
    const taxes = es.filter(e => e.t === REF.TAX), used = new Set();
    const free = t => !used.has(t.id);
    const payouts = es.filter(e => e.t === REF.PAY).map(e => {
        const tx = taxes.find(t => t.date === e.date && free(t))
            || taxes.find(t => Math.abs(Date.parse(t.date) - Date.parse(e.date)) < 5000 && free(t));
        if (tx) used.add(tx.id);
        const tax = tx ? taxValue(tx) : -Math.abs(e.tx || 0);
        return {e, tax, bal: tx ? tx.b : e.b};
    });
    return {payouts, rest: taxes.filter(free)};
}

export const payoutsOf = (id, day) => pairDay(id, day).payouts;

export function dayStats(ids, day) {
    const s = {sites: 0, gross: 0, tax: 0, last: null};
    for (const id of ids) {
        const {payouts, rest} = pairDay(id, day);
        for (const {e, tax} of payouts) {
            s.sites++;
            s.gross += e.a;
            s.tax += tax;
            if (!s.last || e.date > s.last) s.last = e.date;
        }
        for (const t of rest) s.tax += taxValue(t);
    }
    s.net = s.gross + s.tax;
    return s;
}

// SRP tracking is off until a recipient is set in Settings
export const srpRecipient = () => (state.cfg.srpName || '').trim();

// e: stored entry {a, sp, desc}
export function isSrp(e) {
    const {cfg, names} = state;
    if (!(e.a < 0) || -e.a < (+cfg.srpMin || 0) * 1e6) return false;
    const want = srpRecipient().toLowerCase();
    if (!want) return false;
    return (names[e.sp] || '').toLowerCase() === want || (e.desc || '').toLowerCase().includes(want);
}

export function srpStatus(id) {
    const {cfg} = state;
    const p = entriesOf(id).filter(e => e.t === REF.DON && isSrp(e)).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!p) return {state: 'none'};
    const paid = Date.parse(p.date), validMs = (+cfg.srpHours || 24) * 3600e3, until = paid + validMs,
        left = until - Date.now();
    const st = left <= 0 ? 'expired' : left < (+cfg.warnMin || 0) * 60e3 ? 'soon' : 'ok';
    return {state: st, p, paid, until, left, frac: Math.max(0, Math.min(1, left / validMs))};
}
