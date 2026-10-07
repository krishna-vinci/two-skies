// UTC offset helper shared by the UI and the server.

/** UTC offset in minutes for an IANA zone at `at` (handles DST). */
export function tzOffsetMin(tz, at = new Date()) {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value
    const m = name?.match(/GMT([+\u2212-])(\d{2}):(\d{2})/)
    if (!m) return 0
    return (m[1] === '+' ? 1 : -1) * (Number(m[2]) * 60 + Number(m[3]))
  } catch {
    return 0
  }
}
