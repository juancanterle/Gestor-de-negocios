const crypto = require('crypto')

const SESSION_TIMEOUT_MS = 30 * 60 * 1000

let current = null

function createSession({ id, name, role }) {
  current = {
    sessionId: crypto.randomUUID(),
    userId: id,
    name,
    role,
    startedAt: Date.now(),
    lastActivity: Date.now(),
  }
  return publicView(current)
}

function touch() {
  if (!current) return null
  if (Date.now() - current.lastActivity > SESSION_TIMEOUT_MS) {
    current = null
    return null
  }
  current.lastActivity = Date.now()
  return current
}

function getSession() {
  const t = touch()
  return t ? publicView(t) : null
}

function clearSession() {
  current = null
}

function publicView(s) {
  return { sessionId: s.sessionId, userId: s.userId, name: s.name, role: s.role }
}

const ROLE_RANK = { CASHIER: 1, MANAGER: 2, OWNER: 3 }

function hasMinRole(actual, min) {
  return (ROLE_RANK[actual] || 0) >= (ROLE_RANK[min] || 0)
}

module.exports = { createSession, getSession, clearSession, hasMinRole, SESSION_TIMEOUT_MS }
