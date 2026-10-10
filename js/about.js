// About page: version, project links, donation.
import {VERSION, LICENSE, REPO_URL} from './config.js';
import {$, $$} from './format.js';
import {toast} from './ui.js';

export function bindAbout() {
    $('#aboutVersion').textContent = `v${VERSION} · ${LICENSE} · © 2026 Jan-Frederic Schubert`;
    $('#aboutLicense').textContent = LICENSE;
    for (const a of $$('.repo-link')) a.href = REPO_URL + a.dataset.path;
    $('#donateCopy').onclick = async () => {
        try {
            await navigator.clipboard.writeText('Mister Forever');
            toast('“Mister Forever” copied to the clipboard', 'ok');
        } catch {
            toast('Copying failed – please copy the name by hand.', 'err');
        }
    };
}
