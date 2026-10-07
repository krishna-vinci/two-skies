import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Place } from './types'

export type Lang = 'en' | 'th'

const en = {
  localTime: 'local time',
  feels: 'Feels',
  high: 'H',
  low: 'L',
  retry: 'Retry',
  unreachable: "Can't reach the weather service.",
  updated: 'updated {when}',
  justNow: 'just now',
  minAgo: '{n} min ago',
  hourAgo: '{n} h ago',
  switchPlace: 'Switch place',
  ahead: '{place} is {diff} ahead',
  behind: '{place} is {diff} behind',
  sameTime: 'Same time',
  chipWarmer: '{n}° warmer',
  chipCooler: '{n}° cooler',
  chipSame: 'Same temp',
  next24: 'Next 24 hours',
  now: 'Now',
  sevenDay: '7-day forecast',
  today: 'Today',
  sun: 'Sun',
  daylight: 'DAYLIGHT',
  wind: 'Wind',
  windFrom: 'km/h from {dir}',
  air: 'Air quality',
  conditions: 'Conditions',
  humidity: 'Humidity',
  uvIndex: 'UV index',
  rainNow: 'Rain now',
  pctToday: '{n}% today',
  cloudCover: 'Cloud cover',
  feelsLike: 'Feels like',
  loading: 'Loading…',
  unavailable: 'Weather unavailable right now.',
  localSuffix: 'local',
  back: 'Back',
  headsUp: 'Heads up',
  rainOutlook: 'Rain outlook',
  uvLow: 'Low',
  uvModerate: 'Moderate',
  uvHigh: 'High',
  uvVeryHigh: 'Very high',
  uvExtreme: 'Extreme',
  aqiGood: 'Good',
  aqiModerate: 'Moderate',
  aqiSensitive: 'Unhealthy for sensitive groups',
  aqiUnhealthy: 'Unhealthy',
  aqiVery: 'Very unhealthy',
  aqiHazardous: 'Hazardous',
  dirN: 'N',
  dirNE: 'NE',
  dirE: 'E',
  dirSE: 'SE',
  dirS: 'S',
  dirSW: 'SW',
  dirW: 'W',
  dirNW: 'NW',
  together: 'Together',
  togetherSub: 'Your two days, side by side',
  bothAwake: 'Both awake · {dur} left',
  nextTogether: "Next time you're both up: in {dur}",
  asleepOne: '{name} is probably asleep',
  bothAsleep: 'Both asleep',
  awakeAssume: 'Assuming awake {from}–{to}',
  sunriseIn: '{place}: sunrise in {dur}',
  sunsetIn: '{place}: sunset in {dur}',
  nowMarker: 'now',
  notifications: 'Notifications',
  notifyIntro: 'Get a nudge before it rains and when the air or heat gets rough.',
  notifyEnable: 'Turn on notifications',
  notifyDisable: 'Turn off on this device',
  notifyOn: 'Notifications are on for this device',
  notifyRain: 'Rain starting soon',
  notifyAlerts: 'Air quality, heat, UV and storms',
  notifyMorning: 'Morning summary (07:30)',
  notifyPlaces: 'Places to watch',
  notifyTest: 'Send a test',
  notifyTestSent: 'Test sent',
  notifyDenied: 'Notifications are blocked in your browser settings.',
  notifyUnsupported: "This browser can't do push notifications.",
  notifyIosHint: 'On iPhone: Share → Add to Home Screen, then open the app from there.',
  notifyHttps: 'Notifications need the https:// address of the app.',
  notifyError: 'Something went wrong. Try again.',
  close: 'Close',
  langToggle: 'ไทย',
  settings: 'Settings',
  settingsSub: 'Make it yours.',
  ourSkies: 'Our two skies',
  sideName: 'Name (optional)',
  addCity: 'Add a city',
  makeFirst: 'Make default',
  defaultCity: 'default',
  needOneCity: 'Each side needs at least one city.',
  save: 'Save changes',
  saved: 'Saved',
  saveFailed: 'Could not save. Try again.',
  language: 'Language',
  wakingHours: 'Waking hours',
  wakingHoursHint: 'Used by the Together screen to show when you are both awake.',
  from: 'From',
  to: 'To',
  about: 'About',
  aboutText: 'Open source. Weather data by Open-Meteo.com (CC BY 4.0).',
  welcomeTitle: 'Two skies',
  welcomeSub: 'Keep an eye on the weather where you both are. Two places, side by side.',
  welcomeStepA: 'The first sky',
  welcomeStepB: 'The second sky',
  welcomeHintA: 'Who or where is the first sky? Pick up to three cities; the first is shown by default.',
  welcomeHintB: 'Now the second sky.',
  welcomeNext: 'Next',
  welcomeDone: 'Start',
  welcomeBack: 'Back',
  useExample: 'Use example cities',
  maxThree: 'Up to three cities per side.',
  alreadyAdded: 'That city is already in your list.',
  places: 'Places',
  placesSub: 'Cities you add. Just for looking, no alerts.',
  noPlacesYet: 'Nothing here yet. Search for a city above.',
  searchPlace: 'Search a city…',
  searching: 'Searching…',
  noResults: 'No match. Try another spelling, or add by coordinates.',
  addCoords: 'Add by coordinates',
  placeName: 'Name',
  latitude: 'Latitude',
  longitude: 'Longitude',
  addBtn: 'Add',
  removePlace: 'Remove',
  coordsInvalid: 'Enter a name and valid coordinates.',
  searchFailed: 'Search failed. Check your connection.',
  notifyHourly: 'Hourly update (07:00–22:00)',
  notifyHourlyChanged: 'Only when something changed',
  attribution: 'Weather data by Open-Meteo.com',
} as const

export type Key = keyof typeof en

const th: Record<Key, string> = {
  localTime: 'เวลาท้องถิ่น',
  feels: 'รู้สึกเหมือน',
  high: 'สูง',
  low: 'ต่ำ',
  retry: 'ลองใหม่',
  unreachable: 'เชื่อมต่อบริการสภาพอากาศไม่ได้',
  updated: 'อัปเดต {when}',
  justNow: 'เมื่อสักครู่',
  minAgo: '{n} นาทีที่แล้ว',
  hourAgo: '{n} ชม.ที่แล้ว',
  switchPlace: 'เปลี่ยนสถานที่',
  ahead: '{place} เร็วกว่า {diff}',
  behind: '{place} ช้ากว่า {diff}',
  sameTime: 'เวลาเดียวกัน',
  chipWarmer: 'อุ่นกว่า {n}°',
  chipCooler: 'เย็นกว่า {n}°',
  chipSame: 'อุณหภูมิเท่ากัน',
  next24: '24 ชั่วโมงข้างหน้า',
  now: 'ตอนนี้',
  sevenDay: 'พยากรณ์ 7 วัน',
  today: 'วันนี้',
  sun: 'ดวงอาทิตย์',
  daylight: 'กลางวัน',
  wind: 'ลม',
  windFrom: 'กม./ชม. จากทิศ{dir}',
  air: 'คุณภาพอากาศ',
  conditions: 'สภาพอากาศ',
  humidity: 'ความชื้น',
  uvIndex: 'ดัชนียูวี',
  rainNow: 'ฝนตอนนี้',
  pctToday: '{n}% วันนี้',
  cloudCover: 'เมฆปกคลุม',
  feelsLike: 'รู้สึกเหมือน',
  loading: 'กำลังโหลด…',
  unavailable: 'ตอนนี้ไม่มีข้อมูลสภาพอากาศ',
  localSuffix: 'ท้องถิ่น',
  back: 'กลับ',
  headsUp: 'ควรรู้',
  rainOutlook: 'แนวโน้มฝน',
  uvLow: 'ต่ำ',
  uvModerate: 'ปานกลาง',
  uvHigh: 'สูง',
  uvVeryHigh: 'สูงมาก',
  uvExtreme: 'รุนแรง',
  aqiGood: 'ดี',
  aqiModerate: 'ปานกลาง',
  aqiSensitive: 'ไม่ดีต่อกลุ่มเสี่ยง',
  aqiUnhealthy: 'ไม่ดีต่อสุขภาพ',
  aqiVery: 'แย่มาก',
  aqiHazardous: 'อันตราย',
  dirN: 'เหนือ',
  dirNE: 'ตะวันออกเฉียงเหนือ',
  dirE: 'ตะวันออก',
  dirSE: 'ตะวันออกเฉียงใต้',
  dirS: 'ใต้',
  dirSW: 'ตะวันตกเฉียงใต้',
  dirW: 'ตะวันตก',
  dirNW: 'ตะวันตกเฉียงเหนือ',
  together: 'ด้วยกัน',
  togetherSub: 'สองวันของเรา เคียงข้างกัน',
  bothAwake: 'ตื่นทั้งคู่ · อีก {dur}',
  nextTogether: 'ช่วงที่ตื่นทั้งคู่ครั้งต่อไป: อีก {dur}',
  asleepOne: '{name} น่าจะหลับอยู่',
  bothAsleep: 'หลับทั้งคู่',
  awakeAssume: 'สมมติว่าตื่น {from}–{to}',
  sunriseIn: '{place}: ดวงอาทิตย์ขึ้นในอีก {dur}',
  sunsetIn: '{place}: ดวงอาทิตย์ตกในอีก {dur}',
  nowMarker: 'ตอนนี้',
  notifications: 'การแจ้งเตือน',
  notifyIntro: 'รับแจ้งก่อนฝนตก และเมื่ออากาศหรือความร้อนแย่',
  notifyEnable: 'เปิดการแจ้งเตือน',
  notifyDisable: 'ปิดในเครื่องนี้',
  notifyOn: 'เปิดการแจ้งเตือนในเครื่องนี้แล้ว',
  notifyRain: 'ฝนกำลังจะตก',
  notifyAlerts: 'คุณภาพอากาศ ความร้อน ยูวี และพายุ',
  notifyMorning: 'สรุปตอนเช้า (07:30)',
  notifyPlaces: 'สถานที่ที่ติดตาม',
  notifyTest: 'ส่งข้อความทดสอบ',
  notifyTestSent: 'ส่งแล้ว',
  notifyDenied: 'การแจ้งเตือนถูกบล็อกในการตั้งค่าเบราว์เซอร์',
  notifyUnsupported: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน',
  notifyIosHint: 'บน iPhone: แชร์ → เพิ่มลงในหน้าจอโฮม แล้วเปิดแอปจากที่นั่น',
  notifyHttps: 'การแจ้งเตือนต้องใช้ที่อยู่ https:// ของแอป',
  notifyError: 'เกิดข้อผิดพลาด ลองอีกครั้ง',
  close: 'ปิด',
  langToggle: 'EN',
  settings: 'ตั้งค่า',
  settingsSub: 'ปรับให้เป็นของเรา',
  ourSkies: 'สองท้องฟ้าของเรา',
  sideName: 'ชื่อ (ไม่บังคับ)',
  addCity: 'เพิ่มเมือง',
  makeFirst: 'ตั้งเป็นค่าเริ่มต้น',
  defaultCity: 'ค่าเริ่มต้น',
  needOneCity: 'แต่ละฝั่งต้องมีอย่างน้อยหนึ่งเมือง',
  save: 'บันทึกการเปลี่ยนแปลง',
  saved: 'บันทึกแล้ว',
  saveFailed: 'บันทึกไม่สำเร็จ ลองอีกครั้ง',
  language: 'ภาษา',
  wakingHours: 'ช่วงเวลาที่ตื่น',
  wakingHoursHint: 'ใช้ในหน้า "ด้วยกัน" เพื่อดูว่าเราตื่นพร้อมกันตอนไหน',
  from: 'ตั้งแต่',
  to: 'ถึง',
  about: 'เกี่ยวกับ',
  aboutText: 'โอเพนซอร์ส ข้อมูลสภาพอากาศจาก Open-Meteo.com (CC BY 4.0)',
  welcomeTitle: 'สองท้องฟ้า',
  welcomeSub: 'ดูสภาพอากาศของที่ที่เราอยู่ สองที่ เคียงข้างกัน',
  welcomeStepA: 'ท้องฟ้าแรก',
  welcomeStepB: 'ท้องฟ้าที่สอง',
  welcomeHintA: 'ท้องฟ้าแรกคือใครหรือที่ไหน เลือกได้สูงสุดสามเมือง เมืองแรกจะแสดงเป็นค่าเริ่มต้น',
  welcomeHintB: 'ต่อไปคือท้องฟ้าที่สอง',
  welcomeNext: 'ถัดไป',
  welcomeDone: 'เริ่มเลย',
  welcomeBack: 'ย้อนกลับ',
  useExample: 'ใช้เมืองตัวอย่าง',
  maxThree: 'ได้สูงสุดสามเมืองต่อฝั่ง',
  alreadyAdded: 'เมืองนี้อยู่ในรายการแล้ว',
  places: 'สถานที่',
  placesSub: 'เมืองที่คุณเพิ่ม ไว้ดูเฉยๆ ไม่มีการแจ้งเตือน',
  noPlacesYet: 'ยังไม่มีสถานที่ ลองค้นหาเมืองด้านบน',
  searchPlace: 'ค้นหาเมือง…',
  searching: 'กำลังค้นหา…',
  noResults: 'ไม่พบ ลองสะกดแบบอื่น หรือเพิ่มด้วยพิกัด',
  addCoords: 'เพิ่มด้วยพิกัด',
  placeName: 'ชื่อ',
  latitude: 'ละติจูด',
  longitude: 'ลองจิจูด',
  addBtn: 'เพิ่ม',
  removePlace: 'ลบ',
  coordsInvalid: 'กรอกชื่อและพิกัดให้ถูกต้อง',
  searchFailed: 'ค้นหาไม่สำเร็จ ตรวจสอบการเชื่อมต่อ',
  notifyHourly: 'อัปเดตทุกชั่วโมง (07:00–22:00)',
  notifyHourlyChanged: 'เฉพาะเมื่อมีการเปลี่ยนแปลง',
  attribution: 'ข้อมูลสภาพอากาศจาก Open-Meteo.com',
}

const DICT: Record<Lang, Record<Key, string>> = { en, th }

export const localeFor = (lang: Lang) => (lang === 'th' ? 'th-TH-u-nu-latn' : 'en-GB')

/** Main title + secondary line for a place in the current language. */
export function placeLabels(p: Place, lang: Lang): { title: string; sub: string } {
  if (lang === 'th' && p.nameTh) return { title: p.nameTh, sub: p.name }
  return { title: p.name, sub: p.subtitle ?? '' }
}

type Vars = Record<string, string | number>
export const translate = (lang: Lang, key: Key, vars?: Vars) =>
  DICT[lang][key].replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`))

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: Key, vars?: Vars) => string
}
const LangContext = createContext<Ctx | null>(null)
const STORE = 'ts.lang'

function initialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q === 'en' || q === 'th') return q
  try {
    const saved = localStorage.getItem(STORE)
    if (saved === 'en' || saved === 'th') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORE, l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useI18n(): Ctx {
  const c = useContext(LangContext)
  if (!c) throw new Error('LangProvider missing')
  return c
}

export const DIR_KEYS: Key[] = ['dirN', 'dirNE', 'dirE', 'dirSE', 'dirS', 'dirSW', 'dirW', 'dirNW']
