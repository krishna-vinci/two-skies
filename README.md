# Two Skies

Private weather PWA (Open-Meteo): Kothagudem/Hyderabad + Khon Kaen/Bangkok.

- Dev: `npm run dev`  ·  Test: `npm test`  ·  Build: `npm run build`
- Served by systemd user unit `two-skies.service` (`node server/server.mjs`, port 47318, all interfaces).
- Password + cookie secret live in `~/.config/two-skies/env` (mode 600): `TS_PASSWORD`, `TS_COOKIE_SECRET`.
  Login lasts 100 days (renewed on each visit). Change password: edit the file, `systemctl --user restart two-skies`.
- After code changes: `npm run build && systemctl --user restart two-skies`.
- Push state (VAPID keys + subscriptions) lives in `~/.local/state/two-skies/push.json` (mode 600). Back it up if you care; deleting it just means re-enabling notifications on each device.
- Shared rules/messages used by both UI and server: `shared/` (rain nowcast, air/heat alerts, EN/TH text).
- Language: EN/ไทย toggle at the seam; notifications follow the language chosen when subscribing.
- Debug sky: `?debug=1` (sliders), `?debug=1&open=him|her` (opens detail).

## Deployments

| Host | Path | Service |
|---|---|---|
| 192.168.0.128 | `~/weather` | `systemctl --user … two-skies` |
| 192.168.0.55 | `~/two-skies` (clone of this repo) | `systemctl --user … two-skies` |

Both listen on `:47318`, keep their own `~/.config/two-skies/env`, and have linger enabled so they start at boot.

Update the second box:

```bash
ssh krishna@192.168.0.55 'export PATH=$HOME/.nvm/versions/node/v25.7.0/bin:$PATH XDG_RUNTIME_DIR=/run/user/$(id -u)
  cd ~/two-skies && git pull --ff-only && npm ci && npm run build && systemctl --user restart two-skies'
```

The server compresses text assets (brotli/gzip, cached in memory) and serves hashed assets as immutable.
