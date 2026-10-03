// Password-gated static server for the Two Skies build. No dependencies.
// Env: TS_PASSWORD (plain) or TS_PASSWORD_HASH (scrypt$salt$hash), TS_COOKIE_SECRET, PORT, HOST
import { createServer } from 'node:http'
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT ?? 47318)
const HOST = process.env.HOST ?? '0.0.0.0'
const PASSWORD = process.env.TS_PASSWORD ?? ''
const HASH = process.env.TS_PASSWORD_HASH ?? ''
const SECRET = process.env.TS_COOKIE_SECRET ?? ''
const COOKIE = 'ts_session'
const MAX_AGE = 100 * 24 * 60 * 60 // 100 days, seconds
const PUBLIC = new Set(['/manifest.webmanifest', '/icon.svg'])

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const sign = (v) => createHmac('sha256', SECRET).update(v).digest('hex')
const safeEq = (a, b) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function verifyPassword(pw) {
  if (PASSWORD) return safeEq(sign('pw:' + pw), sign('pw:' + PASSWORD))
  const [scheme, salt, hash] = HASH.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const got = scryptSync(pw, Buffer.from(salt, 'hex'), 32).toString('hex')
  return safeEq(got, hash)
}

const makeToken = () => {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE)
  return `${exp}.${sign(exp)}`
}

function validToken(token) {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !safeEq(sig, sign(exp))) return false
  return Number(exp) > Date.now() / 1000
}

const cookieHeader = (value, maxAge) =>
  `${COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax`

function getCookie(req) {
  const m = (req.headers.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  return m?.[1]
}

// brute-force brake: 5 failures per IP -> 5 minute lock
const fails = new Map()
function locked(ip) {
  const f = fails.get(ip)
  return !!f && f.n >= 5 && Date.now() < f.until
}
function recordFail(ip) {
  const f = fails.get(ip) ?? { n: 0, until: 0 }
  f.n += 1
  if (f.n >= 5) f.until = Date.now() + 5 * 60_000
  fails.set(ip, f)
}

const page = (body, status = 200, headers = {}) => ({ body, status, headers })

const loginHtml = (msg = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1020"><title>Two Skies</title>
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;color:#fff;
background:radial-gradient(120% 90% at 20% 0%,#3b5bdb 0%,transparent 55%),
radial-gradient(100% 80% at 90% 100%,#f08a7a 0%,transparent 55%),#0b1020}
form{width:min(340px,86vw);padding:30px 26px;border-radius:28px;background:rgba(255,255,255,.1);
border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(22px) saturate(160%);
-webkit-backdrop-filter:blur(22px) saturate(160%);box-shadow:0 8px 40px rgba(0,0,0,.25)}
h1{font-weight:200;font-size:32px;margin:0 0 4px;letter-spacing:-.02em}
p{margin:0 0 22px;font-weight:300;font-size:14px;color:rgba(255,255,255,.7)}
input{width:100%;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.25);
background:rgba(0,0,0,.25);color:#fff;font-size:16px;outline:none}
input:focus{border-color:rgba(255,255,255,.6)}
button{width:100%;margin-top:12px;padding:14px;border:0;border-radius:16px;font-size:15px;font-weight:600;
color:#0b1020;background:linear-gradient(90deg,#fde68a,#fdba74);cursor:pointer}
.e{margin-top:12px;font-size:13px;color:#fecaca;min-height:1em}
</style></head><body><form method="post" action="/login">
<h1>Two Skies</h1><p>Just for the two of you.</p>
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Open</button><div class="e">${msg}</div></form></body></html>`

const setupHtml = `<!doctype html><meta charset="utf-8"><title>Two Skies</title>
<body style="font-family:system-ui;background:#0b1020;color:#fff;padding:32px;line-height:1.5">
<h1>Password not set</h1><p>Set TS_PASSWORD and TS_COOKIE_SECRET in ~/.config/two-skies/env, then restart the service.</p></body>`

async function readBody(req) {
  let data = ''
  for await (const c of req) {
    data += c
    if (data.length > 4096) break
  }
  return data
}

async function serveFile(path) {
  try {
    const st = await stat(path)
    if (!st.isFile()) return null
    return { buf: await readFile(path), type: MIME[extname(path)] ?? 'application/octet-stream' }
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const ip = req.socket.remoteAddress ?? 'unknown'
  const url = new URL(req.url ?? '/', 'http://x')
  const send = (p) => {
    res.writeHead(p.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...p.headers })
    res.end(p.body)
  }

  if (!(PASSWORD || HASH) || !SECRET) return send(page(setupHtml, 503))

  if (url.pathname === '/logout') {
    return send(page('', 302, { location: '/login', 'set-cookie': cookieHeader('', 0) }))
  }

  if (url.pathname === '/login') {
    if (req.method === 'POST') {
      if (locked(ip)) return send(page(loginHtml('Too many attempts. Try again in a few minutes.'), 429))
      const pw = new URLSearchParams(await readBody(req)).get('password') ?? ''
      if (verifyPassword(pw)) {
        fails.delete(ip)
        return send(page('', 303, { location: '/', 'set-cookie': cookieHeader(makeToken(), MAX_AGE) }))
      }
      recordFail(ip)
      return send(page(loginHtml('Wrong password.'), 401))
    }
    if (validToken(getCookie(req))) return send(page('', 302, { location: '/' }))
    return send(page(loginHtml()))
  }

  const authed = validToken(getCookie(req))
  if (!authed && !PUBLIC.has(url.pathname)) {
    if (req.method === 'GET' && (req.headers.accept ?? '').includes('text/html')) {
      return send(page('', 302, { location: '/login' }))
    }
    res.writeHead(401).end()
    return
  }

  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const target = join(ROOT, rel === '/' ? 'index.html' : rel)
  let file = target.startsWith(ROOT) ? await serveFile(target) : null
  const isShell = !file
  if (!file) file = await serveFile(join(ROOT, 'index.html'))
  if (!file) {
    res.writeHead(500).end('build missing: run npm run build')
    return
  }
  const headers = {
    'content-type': file.type,
    'cache-control': /\/assets\//.test(rel) ? 'public, max-age=31536000, immutable' : 'no-cache',
  }
  // sliding session: every page view renews the 100 days
  if (authed && (isShell || rel === '/' || rel.endsWith('.html'))) headers['set-cookie'] = cookieHeader(makeToken(), MAX_AGE)
  res.writeHead(200, headers)
  res.end(file.buf)
}).listen(PORT, HOST, () => console.log(`two-skies listening on ${HOST}:${PORT}`))
