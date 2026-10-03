# Two Skies

Private weather PWA (Open-Meteo): Kothagudem/Hyderabad + Khon Kaen/Bangkok.

- Dev: `npm run dev`  ·  Test: `npm test`  ·  Build: `npm run build`
- Served by systemd user unit `two-skies.service` (`node server/server.mjs`, port 47318, all interfaces).
- Password + cookie secret live in `~/.config/two-skies/env` (mode 600): `TS_PASSWORD`, `TS_COOKIE_SECRET`.
  Login lasts 100 days (renewed on each visit). Change password: edit the file, `systemctl --user restart two-skies`.
- After code changes: `npm run build && systemctl --user restart two-skies`.
- Debug sky: `?debug=1` (sliders), `?debug=1&open=him|her` (opens detail).
