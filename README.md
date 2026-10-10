<img src="icon.svg" alt="Incursion Tracker" width="96" align="right">

# Incursion Tracker

🌐 **[Open the tracker](https://jfschubert.github.io/incursion-tracker/)**

Tracks your daily **incursion income** and **SRP coverage** for all your EVE Online characters, straight from
the wallet journal via ESI. It runs entirely in the browser – nothing to install, works on Windows, macOS, Linux
and phones.

## Features

- **Multiple characters** – log in with EVE SSO once per character, they stay logged in
- **Daily income** – sums *Corporate Reward Payout* (CONCORD) and *Corporate Reward Tax* for the current EVE day
  (UTC): net, sites, payout and corp tax, per pilot and in total
- **Payout list** – every site payout of the day, paired with its tax entry
- **Last 14 days** – daily totals with bars, per pilot or for all; click a day to see its income and payouts
- **SRP status** – finds the latest *Player Donation* to your SRP corporation and counts down until it expires
  (validity, minimum amount and warning time are configurable)
- **Notifications** – toasts and optional desktop notifications for new payouts and expiring / expired SRP
- **ESI-friendly** – each character is only re-read when ESI's cache expires (journal up to 1 h, wallet 2 min),
  with back-off on the ESI error limit

## Usage

1. Open the [tracker](https://jfschubert.github.io/incursion-tracker/) and click **Add character**.
2. Log in with EVE Online and allow wallet access. Repeat for each character.
3. Under **Settings → SRP rule**, enter the name of your SRP corporation (the recipient of your SRP payment)
   and how long a payment stays valid.

New payouts can take up to an hour to appear – that's how long ESI caches the wallet journal.

### Privacy

Characters, login tokens and the relevant journal entries are stored only in your browser's local storage. The
page talks to nothing but the EVE SSO and ESI. The only permission requested is
`esi-wallet.read_character_wallet.v1` (read-only). **Settings → Stored data** removes everything.

## Self-hosting

Download the zip from the [latest release](https://github.com/jfschubert/incursion-tracker/releases/latest)
(or clone the repo) and serve the folder – EVE SSO can't redirect to `file://`:

```bash
python -m http.server 8080
```

1. Create an application on [developers.eveonline.com](https://developers.eveonline.com/applications) with the
   scope `esi-wallet.read_character_wallet.v1` and the callback URL `http://localhost:8080/`.
2. Open <http://localhost:8080/>, go to **Settings → ESI application** and paste the Client ID. No secret is
   needed – login uses PKCE.

## Development

Plain HTML, CSS and ES modules – no build step. Serve the folder as above and edit.

| File | Purpose |
|---|---|
| `js/main.js` | startup, timers, SRP alerts |
| `js/config.js` | constants, version, built-in ESI application |
| `js/store.js` | persisted state (localStorage), change notifications |
| `js/sso.js` | EVE SSO login (PKCE), token refresh |
| `js/esi.js` | ESI requests, per-character read schedule |
| `js/analysis.js` | daily totals, payout ↔ tax pairing, SRP status |
| `js/render.js` | tracker windows, countdowns |
| `js/settings.js`, `js/about.js`, `js/ui.js` | settings, about page, toasts / tooltips / pages |

### Releases and GitHub Pages

[`.github/workflows/release.yml`](.github/workflows/release.yml) deploys to GitHub Pages and creates a release:

1. Bump `VERSION` in `js/config.js` and commit.
2. `git tag v1.2.3 && git push --tags` – the workflow fails if tag and `VERSION` differ.

A manual run of the workflow deploys to Pages without creating a release.

One-time setup:

- **Settings → Pages → Source:** "GitHub Actions".
- **Settings → Secrets and variables → Actions → Variables:** `ESI_CLIENT_ID` = the Client ID of an ESI
  application whose callback URL is the Pages URL (`https://<user>.github.io/<repo>/`). The workflow injects it
  together with the callback URL, so users on the hosted page only need to log in. Without it, the hosted page
  asks users for their own Client ID. The ID ends up public in the page either way – that's fine, since login
  uses PKCE and needs no secret.

## License

GPL-3.0 – see [LICENSE](LICENSE). The design is based on [FleetCommander](https://github.com/jfschubert/FleetCommander);
UI icons are from [Lucide](https://lucide.dev) (ISC).

EVE Online® and Fenris Creations™ and all related logos and other elements are trademarks of Fenris Creations
(formerly CCP Games). Incursion Tracker is an unofficial third-party tool and is not affiliated with, endorsed or
approved by Fenris Creations. It only reads wallet data through the official ESI API.
