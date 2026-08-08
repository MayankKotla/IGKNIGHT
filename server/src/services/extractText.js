// NOTE on the PDF path: we use pdfjs-dist directly (text extraction only,
// no rendering) rather than the pdf-parse package. pdf-parse@2.x hard-
// requires @napi-rs/canvas, a native binding with per-platform prebuilt
// binaries — installing it on one machine and running on another (e.g. this
// sandbox vs. your Mac) grabs the wrong platform's binary and crashes the
// whole server on require(). pdf-parse@1.x avoids that but bundles a pdf.js
// build from ~2017 that fails on PDFs written by modern tools. pdfjs-dist's
// canvas dependency is only used for rendering pages to images, which we
// never do here, so requiring it directly sidesteps both problems. It's
// loaded via dynamic import() (not require()) since pdfjs-dist ships ESM
// only — import() works from CommonJS on any modern Node version, whereas
// require()-ing an .mjs file only works on newer ones.
let pdfjsLibPromise = null
function loadPdfjs() {
  if (!pdfjsLibPromise) pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjsLibPromise
}

const mammoth = require('mammoth')
const JSZip = require('jszip')

// Cap extracted text so a large document doesn't blow up the quiz-generation
// prompt's token budget.
const MAX_EXTRACTED_CHARS = 6000

function truncate(text) {
  if (!text) return text
  const trimmed = text.trim()
  return trimmed.length > MAX_EXTRACTED_CHARS
    ? `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n[...truncated]`
    : trimmed
}

async function extractPdfText(buffer) {
  const pdfjsLib = await loadPdfjs()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  })
  const doc = await loadingTask.promise
  try {
    const pageTexts = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pageTexts.push(content.items.map((item) => item.str).join(' '))
    }
    return pageTexts.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function extractPptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10)
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10)
      return na - nb
    })

  const slideTexts = []
  for (const name of slideFiles) {
    const xml = await zip.file(name).async('string')
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]))
    if (runs.length > 0) slideTexts.push(runs.join(' '))
  }
  return slideTexts.join('\n\n')
}

// Supported: .txt (direct read), .pdf (pdfjs-dist), .docx (mammoth), .pptx
// (manual slide-XML extraction). Legacy binary .doc/.ppt and non-vision
// image formats (e.g. HEIC) aren't extractable here and return null.
async function extractTextFromFile({ buffer, fileType, fileName }) {
  const type = (fileType || '').toLowerCase()
  const name = (fileName || '').toLowerCase()

  try {
    if (type === 'text/plain' || name.endsWith('.txt')) {
      return truncate(buffer.toString('utf-8'))
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return truncate(await extractPdfText(buffer))
    }
    if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      return truncate(await extractDocxText(buffer))
    }
    if (
      type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      name.endsWith('.pptx')
    ) {
      return truncate(await extractPptxText(buffer))
    }
    return null
  } catch (err) {
    console.error(`Text extraction failed for ${fileName}:`, err.message)
    return null
  }
}

module.exports = { extractTextFromFile }
