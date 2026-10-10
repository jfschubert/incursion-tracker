// Formatting helpers. All EVE times are UTC.
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const nf = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
export const isk = v => nf.format(Math.round(v || 0)) + ' ISK';

export function short(v) {
    const a = Math.abs(v || 0), s = v < 0 ? '-' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'b';
    if (a >= 1e6) return s + (a / 1e6).toFixed(1) + 'm';
    if (a >= 1e3) return s + (a / 1e3).toFixed(0) + 'k';
    return s + a.toFixed(0);
}

export const utcDay = t => new Date(t).toISOString().slice(0, 10);
export const evTime = iso => iso.slice(11, 16);
// "2026-10-09T22:05:00Z" -> "10.09 22:05"
export const evStamp = t => new Date(t).toISOString().slice(5, 16).replace('T', ' ').replace('-', '.');

export function dur(ms) {
    const neg = ms < 0;
    ms = Math.abs(ms);
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const str = h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;
    return neg ? '-' + str : str;
}

export const portrait = (id, s = 64) => `https://images.evetech.net/characters/${id}/portrait?size=${s}`;
