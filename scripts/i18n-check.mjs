// npm run i18n:check [-- --verbose]
// Reports how complete each translation is and fails on real mistakes
// (unknown keys, or {placeholders} that differ from the English text).
import { DEFAULT_LANG, LOCALES } from '../shared/locales/index.js'

const en = LOCALES[DEFAULT_LANG].messages
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const verbose = process.argv.includes('--verbose')
let problems = 0

console.log(`English has ${Object.keys(en).length} strings. Missing ones fall back to English, so gaps are fine.\n`)
for (const [code, l] of Object.entries(LOCALES)) {
  if (code === DEFAULT_LANG) continue
  const missing = Object.keys(en).filter((k) => !(k in l.messages))
  const unknown = Object.keys(l.messages).filter((k) => !(k in en))
  const mismatched = Object.entries(l.messages)
    .filter(([k, v]) => k in en && placeholders(v) !== placeholders(en[k]))
    .map(([k]) => k)
  const done = Object.keys(en).length - missing.length
  const pct = Math.round((100 * done) / Object.keys(en).length)
  console.log(`${code.padEnd(5)}${l.name.padEnd(20)}${String(pct).padStart(4)}%   missing ${missing.length}   unknown ${unknown.length}   placeholder mismatch ${mismatched.length}`)
  if (verbose || (missing.length > 0 && missing.length <= 12)) for (const k of missing) console.log(`        missing: ${k}`)
  for (const k of unknown) console.log(`        UNKNOWN KEY: ${k}`) || problems++
  for (const k of mismatched) console.log(`        PLACEHOLDERS DIFFER: ${k}   en: "${en[k]}"   ${code}: "${l.messages[k]}"`) || problems++
}
if (problems) {
  console.error(`\n${problems} problem(s) to fix.`)
  process.exit(1)
}
console.log('\nNo problems found.')
