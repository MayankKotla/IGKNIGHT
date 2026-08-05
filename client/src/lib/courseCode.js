export const UCF_CODE_RE = /^[A-Z]{2,4}\s\d{4}[A-Z]?$/

export function normalizeCourseCode(raw) {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  return clean.replace(/^([A-Z]{2,4})(\d{4}[A-Z]?)$/, '$1 $2')
}

// Strip spaces for comparison so "COP3502" matches "COP 3502C" as a substring
export function normalizeForSearch(raw) {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}
