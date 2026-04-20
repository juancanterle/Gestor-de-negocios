const { ipcMain } = require('electron')
const { getSession, hasMinRole } = require('./session')

class IpcError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'IpcError'
    this.code = code || 'IPC_ERROR'
  }
}

function safeHandler(channel, handler, opts = {}) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (opts.requireAuth || opts.requireRole) {
        const session = getSession()
        if (!session) {
          return { ok: false, error: 'Sesión expirada. Iniciá sesión de nuevo.', code: 'AUTH_REQUIRED' }
        }
        if (opts.requireRole && !hasMinRole(session.role, opts.requireRole)) {
          return { ok: false, error: `Acción restringida (requiere rol ${opts.requireRole}).`, code: 'FORBIDDEN' }
        }
      }
      const data = await handler(event, ...args)
      return { ok: true, data }
    } catch (err) {
      if (err instanceof IpcError) {
        return { ok: false, error: err.message, code: err.code }
      }
      console.error(`[ipc:${channel}]`, err)
      return {
        ok: false,
        error: err?.message || 'Error interno',
        code: 'INTERNAL',
      }
    }
  })
}

module.exports = { safeHandler, IpcError }
