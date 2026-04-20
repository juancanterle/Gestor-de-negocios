import type { IpcResponse } from '../types/api'

/**
 * Unwrap an IpcResponse. Throws on error so callers can catch with try/catch.
 */
export function unwrap<T>(r: IpcResponse<T>): T {
  if (!r.ok) throw new Error(r.error)
  return r.data
}
