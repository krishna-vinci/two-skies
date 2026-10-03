// Text shared by the UI and push notifications (en / th).
const fmtMin = (m, lang) => {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (lang === 'th') return h ? `${h} ชม. ${r} นาที` : `${m} นาที`
  return h ? `${h} h ${r} min` : `${m} min`
}

const ALERTS = {
  en: {
    aqi: [
      (v) => ['Air quality: sensitive groups at risk', `AQI ${v}. Sensitive people should limit time outside.`],
      (v) => ['Unhealthy air', `AQI ${v}. Wear a mask outdoors.`],
      (v) => ['Very unhealthy air', `AQI ${v}. Stay indoors if you can.`],
    ],
    heat: [
      (v) => ['Hot day', `Feels like up to ${v}°. Drink plenty of water.`],
      (v) => ['Extreme heat', `Feels like up to ${v}°. Avoid the midday sun.`],
      (v) => ['Dangerous heat', `Feels like up to ${v}°. Stay cool indoors.`],
    ],
    uv: [
      () => ['Very high UV', 'Use sunscreen and find shade.'],
      () => ['Extreme UV', 'Avoid direct sun around midday.'],
    ],
    storm: [() => ['Thunderstorm', 'Thunderstorm now or within 3 hours. Stay safe.'], () => ['Thunderstorm', 'Thunderstorm now or within 3 hours. Stay safe.']],
    umbrella: [(v) => ['Carry an umbrella', `${v}% chance of rain today.`]],
  },
  th: {
    aqi: [
      (v) => ['อากาศไม่ดีต่อกลุ่มเสี่ยง', `AQI ${v} กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้ง`],
      (v) => ['อากาศไม่ดีต่อสุขภาพ', `AQI ${v} ควรสวมหน้ากากเมื่ออยู่ข้างนอก`],
      (v) => ['อากาศแย่มาก', `AQI ${v} ควรอยู่ในอาคารหากทำได้`],
    ],
    heat: [
      (v) => ['วันนี้ร้อน', `รู้สึกเหมือน ${v}° ดื่มน้ำเยอะๆ นะ`],
      (v) => ['ร้อนจัด', `รู้สึกเหมือน ${v}° หลีกเลี่ยงแดดช่วงเที่ยง`],
      (v) => ['ร้อนอันตราย', `รู้สึกเหมือน ${v}° อยู่ในที่เย็นไว้นะ`],
    ],
    uv: [
      () => ['รังสียูวีสูงมาก', 'ทาครีมกันแดดและหลบร่มเงา'],
      () => ['รังสียูวีรุนแรง', 'หลีกเลี่ยงแดดจัดช่วงเที่ยง'],
    ],
    storm: [() => ['พายุฝนฟ้าคะนอง', 'มีพายุฝนฟ้าคะนองตอนนี้หรือภายใน 3 ชั่วโมง ระวังตัวด้วยนะ'], () => ['พายุฝนฟ้าคะนอง', 'มีพายุฝนฟ้าคะนองตอนนี้หรือภายใน 3 ชั่วโมง ระวังตัวด้วยนะ']],
    umbrella: [(v) => ['พกร่มไปด้วย', `โอกาสฝนตก ${v}% วันนี้`]],
  },
}

/** -> { title, body } */
export function alertText(alert, lang) {
  const table = (ALERTS[lang] ?? ALERTS.en)[alert.id]
  const [title, body] = table[Math.min(alert.level, table.length) - 1](alert.value)
  return { title, body }
}

export function nowcastText(nc, lang) {
  const th = lang === 'th'
  switch (nc.kind) {
    case 'soon':
      return th ? `ฝนจะตกในอีกประมาณ ${fmtMin(nc.minutes, lang)}` : `Rain in about ${fmtMin(nc.minutes, lang)}`
    case 'ending':
      return th ? `ฝนจะซาในอีกประมาณ ${fmtMin(nc.minutes, lang)}` : `Rain easing in about ${fmtMin(nc.minutes, lang)}`
    case 'now':
      return th ? 'ฝนตกอยู่ และจะตกต่อเนื่อง' : 'Raining, with no break soon'
    case 'dry':
      return th ? 'ไม่มีฝนใน 2 ชั่วโมงข้างหน้า' : 'No rain for the next 2 hours'
    default:
      return ''
  }
}

const TH_LABELS = {
  0: 'ท้องฟ้าแจ่มใส', 1: 'ฟ้าโปร่ง', 2: 'มีเมฆบางส่วน', 3: 'มีเมฆมาก', 45: 'หมอก', 48: 'หมอกน้ำค้างแข็ง',
  51: 'ฝนปรอยเล็กน้อย', 53: 'ฝนปรอย', 55: 'ฝนปรอยหนัก', 56: 'ฝนปรอยเยือกแข็ง', 57: 'ฝนปรอยเยือกแข็ง',
  61: 'ฝนเล็กน้อย', 63: 'ฝนตก', 65: 'ฝนตกหนัก', 66: 'ฝนเยือกแข็ง', 67: 'ฝนเยือกแข็ง',
  71: 'หิมะเล็กน้อย', 73: 'หิมะตก', 75: 'หิมะตกหนัก', 77: 'เม็ดหิมะ',
  80: 'ฝนตกเป็นช่วงๆ', 81: 'ฝนตกเป็นช่วงๆ', 82: 'ฝนตกหนักเป็นช่วงๆ', 85: 'หิมะตกเป็นช่วงๆ', 86: 'หิมะตกหนักเป็นช่วงๆ',
  95: 'พายุฝนฟ้าคะนอง', 96: 'พายุฝนฟ้าคะนองมีลูกเห็บ', 99: 'พายุฝนฟ้าคะนองรุนแรง',
}
const EN_LABELS = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Severe thunderstorm',
}
export const weatherLabel = (code, lang) =>
  (lang === 'th' ? TH_LABELS[code] ?? 'มีเมฆ' : EN_LABELS[code] ?? 'Cloudy')

/** Morning summary push. */
export function morningText({ placeName, temp, code, hi, lo, rainPct }, lang) {
  const label = weatherLabel(code, lang)
  return lang === 'th'
    ? { title: `${placeName} · ${temp}°`, body: `${label} สูงสุด ${hi}° ต่ำสุด ${lo}° โอกาสฝน ${rainPct}%` }
    : { title: `${placeName} · ${temp}°`, body: `${label}. High ${hi}°, low ${lo}°. Rain chance ${rainPct}%.` }
}

export const testText = (lang) =>
  lang === 'th'
    ? { title: 'Two Skies', body: 'การแจ้งเตือนใช้งานได้แล้ว' }
    : { title: 'Two Skies', body: 'Notifications are working.' }
