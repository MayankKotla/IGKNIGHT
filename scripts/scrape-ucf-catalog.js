/**
 * IgKnight — UCF Course Importer
 *
 * UCF moved from Acalog/Leepfrog to Kuali CM, which requires authentication.
 * No public course API exists. This script instead imports from the curated
 * static dataset at supabase/seed.sql, which covers ~150 courses across all
 * major UCF departments.
 *
 * For any course not in the seed, the app's free-entry flow creates it
 * automatically when a student first uses that course code.
 *
 * Usage:
 *   cd scripts && npm install
 *   node scrape-ucf-catalog.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in server/.env
 */

require('dotenv').config({ path: '../server/.env' })
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const fs   = require('fs')
const path = require('path')

const SUPABASE_URL  = process.env.SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY === 'your-service-role-key-here') {
  console.error('\nMissing SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Add it to server/.env:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...')
  console.error('\nGet it from: Supabase Dashboard > Settings > API > service_role\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// Parse INSERT VALUES rows from the seed.sql file
function parseSeedFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  const courses = []

  // Match each ('CODE', 'Name', 'Dept', credits) tuple
  const rowRe = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\)/g
  let m
  while ((m = rowRe.exec(sql)) !== null) {
    courses.push({
      code:       m[1],
      name:       m[2],
      department: m[3],
      credits:    parseInt(m[4], 10),
    })
  }
  return courses
}

async function main() {
  console.log('\n=== IgKnight UCF Course Importer ===\n')

  const seedPath = path.resolve(__dirname, '../supabase/seed.sql')
  if (!fs.existsSync(seedPath)) {
    console.error('seed.sql not found at', seedPath)
    process.exit(1)
  }

  const courses = parseSeedFile(seedPath)
  console.log(`Parsed ${courses.length} courses from seed.sql`)

  // Upsert in batches of 50
  const BATCH = 50
  let total = 0
  for (let i = 0; i < courses.length; i += BATCH) {
    const batch = courses.slice(i, i + BATCH)
    const { error } = await supabase
      .from('courses')
      .upsert(batch, { onConflict: 'code', ignoreDuplicates: false })

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message)
      continue
    }
    total += batch.length
    console.log(`  Upserted ${total}/${courses.length}`)
  }

  console.log(`\nDone! ${total} courses upserted.\n`)

  const { count } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })

  console.log(`courses table now has ${count} total rows.\n`)
  console.log('Note: students can add any course not listed here via the free-entry')
  console.log('flow in the app — it auto-creates a record on first use.\n')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
