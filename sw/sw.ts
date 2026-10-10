// Custom service worker: offline app shell (Workbox precache) + web push.
// Lives outside src/ so the DOM-typed app tsconfig doesn't try to check it.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any
const sw = self

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/login/, /^\/logout/, /^\/api\//],
  }),
)

sw.addEventListener('install', () => sw.skipWaiting())
sw.addEventListener('activate', (e: any) => e.waitUntil(sw.clients.claim()))

sw.addEventListener('push', (e: any) => {
  let d: { title?: string; body?: string; tag?: string; url?: string } = {}
  try {
    d = e.data?.json() ?? {}
  } catch {
    d = { body: e.data?.text() }
  }
  e.waitUntil(
    (async () => {
      // Android and desktop replace a same-tag notification natively and silently. iOS (WebKit bug 258922)
      // lists the replacement but leaves the old one on screen, so close earlier ones with this tag by hand.
      if (d.tag && (await isApplePush())) {
        const old: any[] = await sw.registration.getNotifications({ tag: d.tag })
        // iOS may ignore the tag filter, so check the tag again
        for (const n of old) if (n.tag === d.tag) n.close()
      }
      await sw.registration.showNotification(d.title ?? 'Two Skies', {
        body: d.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: d.tag,
        data: { url: d.url ?? '/' },
      })
    })(),
  )
})

async function isApplePush(): Promise<boolean> {
  try {
    const sub = await sw.registration.pushManager.getSubscription()
    if (sub) return sub.endpoint.includes('push.apple.com')
  } catch {
    /* fall back to the user agent */
  }
  return /iPhone|iPad|iPod/.test(sw.navigator?.userAgent ?? '')
}

sw.addEventListener('notificationclick', (e: any) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list: any[]) => {
      const open = list.find((c) => 'focus' in c)
      return open ? open.focus() : sw.clients.openWindow(url)
    }),
  )
})
