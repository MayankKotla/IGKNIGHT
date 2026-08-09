export const UCF_CODE_RE = /^[A-Z]{2,4}\s\d{4}[A-Z]?$/

export function normalizeCourseCode(raw) {
  // Strip ALL whitespace first (not just collapse it) so any uneven spacing —
  // "COP  3502C", "COP 3502 C", "C OP3502C" — normalizes the same way, then
  // re-insert a single canonical space between the letter prefix and digits.
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '')
  return clean.replace(/^([A-Z]{2,4})(\d{4}[A-Z]?)$/, '$1 $2')
}

// Strip spaces for comparison so "COP3502" matches "COP 3502C" as a substring
export function normalizeForSearch(raw) {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}
