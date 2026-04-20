const { app, dialog } = require('electron')
const fs = require('fs')
const path = require('path')

function defaultBackupDir() {
  const dir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function timestamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function createBackup(db, { askPath = true } = {}) {
  const defaultName = `kiosco-backup-${timestamp()}.db`
  const defaultPath = path.join(defaultBackupDir(), defaultName)

  let target = defaultPath
  if (askPath) {
    const res = await dialog.showSaveDialog({
      title: 'Guardar backup de la base de datos',
      defaultPath: defaultPath,
      filters: [{ name: 'SQLite DB', extensions: ['db'] }],
    })
    if (res.canceled || !res.filePath) return null
    target = res.filePath
  }

  if (fs.existsSync(target)) fs.unlinkSync(target)
  const esc = target.replace(/'/g, "''")
  db.exec(`VACUUM INTO '${esc}'`)
  const stats = fs.statSync(target)
  return { path: target, bytes: stats.size }
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const esc = v => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [cols.join(',')]
  for (const r of rows) lines.push(cols.map(c => esc(r[c])).join(','))
  return lines.join('\n')
}

async function exportCsv(rows, defaultBaseName = 'export') {
  const res = await dialog.showSaveDialog({
    title: 'Exportar CSV',
    defaultPath: path.join(app.getPath('downloads') || defaultBackupDir(), `${defaultBaseName}-${timestamp()}.csv`),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (res.canceled || !res.filePath) return null
  const csv = toCsv(rows)
  fs.writeFileSync(res.filePath, '\ufeff' + csv, { encoding: 'utf8' })
  return { path: res.filePath, rows: rows.length }
}

module.exports = { createBackup, exportCsv, toCsv }
