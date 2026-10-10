// Daily incursion income and SRP status from the stored journal entries.
import {REF} from './config.js';
import {state, entriesOf} from './store.js';

export function dayStats(ids, day) {
    const s = {sites: 0, gross: 0, tax: 0, last: null};
    for (const id of ids) for (const e of entriesOf(id)) {
        if (e.date.slice(0, 10) !== day) continue;
        if (e.t === REF.PAY) {
            s.sites++;
            s.gross += e.a;
            if (!s.last || e.date > s.last) s.last = e.date;
        } else if (e.t === REF.TAX) s.tax += e.a;
    }
    s.net = s.gross + s.tax;
    return s;
}

// Payouts of one day, each paired with the corp tax entry booked right after it.
export function payoutsOf(id, day) {
    const es = entriesOf(id).filter(e => e.date.slice(0, 10) === day);
    const taxes = es.filter(e => e.t === REF.TAX), used = new Set();
    const free = t => !used.has(t.id);
    return es.filter(e => e.t === REF.PAY).map(e => {
        const tx = taxes.find(t => t.date === e.date && free(t))
            || taxes.find(t => Math.abs(Date.parse(t.date) - Date.parse(e.date)) < 5000 && free(t));
        if (tx) used.add(tx.id);
        return {e, tax: tx ? tx.a : 0, bal: tx ? tx.b : e.b};
    });
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
