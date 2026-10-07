# Adding a language

Two Skies keeps all its wording in plain JSON files, one per language. Adding a language takes about ten minutes and no coding beyond one line. Anything you leave untranslated simply shows in English, so you can start small.

## 1. Copy the English file

```bash
cp shared/locales/en.json shared/locales/xx.json     # xx = the language code: es, pt, ar, pl, ...
```

Use the two-letter [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) code (`pt` for Portuguese, `ar` for Arabic, and so on).

## 2. Translate the values

Open `xx.json`. Each line looks like `"key": "English text"`. **Change only the text on the right.**

```json
"now": "Now",
"chipWarmer": "{n}° warmer",
"alert.heat.2.title": "Extreme heat"
```

Rules that keep it working:

- **Keep every `{placeholder}` exactly as written** (`{n}`, `{place}`, `{dur}`, `{v}`, ...). They are replaced with real values, and you can move them wherever your grammar needs them: `"{n}° warmer"` can become `"warmer by {n}°"`.
- **Don't translate the keys** (the part on the left).
- **Keep it short where space is tight.** Labels such as `high`, `low`, `feels`, `chipWarmer` and the buttons sit in small pills. The English `"H"` / `"L"` (high / low) are one letter; use the shortest natural form.
- **Tone:** friendly and calm, like a message between two people who care about each other.
- You don't have to translate everything. Delete a line (or leave it out) and English fills in.

What the groups of keys are:

| Keys | Where they appear |
|---|---|
| `welcome*`, `settings`, `ourSkies`, `save*`, `language`, `about*` | Welcome screen and Settings |
| `places*`, `searchPlace`, `addCoords`, `latitude`, `longitude` | The Places page and city search |
| `together`, `bothAwake`, `asleepOne`, `sunriseIn`, ... | The Together screen |
| `notify*`, `notifications` | The notification settings |
| `next24`, `sevenDay`, `wind`, `humidity`, `uv*`, `aqi*`, `dir*` | The forecast view |
| `alert.*` | Warnings (air quality, heat, UV, storms), in the app **and** in push notifications |
| `nowcast.*`, `rainChance`, `morning.body`, `hourly.feels`, `push.test` | Rain alerts and push notifications |
| `wx.*` | The weather descriptions ("Light rain", "Fog", ...) |

Things you do **not** need to handle: durations ("1 h 30 min"), "5 minutes ago", weekdays and city names. The browser formats the first three in your language, and city names are looked up in your language automatically.

## 3. Register it

Open `shared/locales/index.js` and add two lines (an import, and an entry):

```js
import xx from './xx.json' with { type: 'json' }

export const LOCALES = {
  // ...
  xx: { name: 'Your language, in your language', dir: 'ltr', intl: 'xx-XX', messages: xx },
}
```

- `name` is what people see in the language picker, written in that language (`'Deutsch'`, `'日本語'`, `'العربية'`).
- `dir` is `'rtl'` for right-to-left languages (Arabic, Hebrew, Persian, Urdu), otherwise `'ltr'`.
- `intl` is a BCP 47 tag used for dates and units (`'de-DE'`, `'pt-BR'`, `'ar-EG'`).

## 4. Check your work

```bash
npm run i18n:check     # how complete is each language; fails on unknown keys or broken {placeholders}
npm test               # the same checks run in the test suite
```

## 5. See it

```bash
npm run dev            # then open http://localhost:5173/?lang=xx
```

Or open the language picker (the language button next to the heart) and choose it. If your phone is set to that language, **Automatic** will pick it up too.

## Opening a pull request

Include only `xx.json` and the two lines in `index.js`. If you're not sure about a phrase, say so in the PR; a native speaker can review it. Corrections to existing languages are just as welcome: edit the JSON and open a PR.

## Notes

- **Right-to-left:** the layout mirrors automatically when `dir` is `'rtl'` (the time axes stay left-to-right on purpose). No right-to-left language is bundled yet, so if you add one, please check the screens and report anything that looks off.
- **Fonts:** the app uses your device's system fonts for non-Latin scripts, so most languages just work.
- **The app name** ("Two Skies") isn't translated.
