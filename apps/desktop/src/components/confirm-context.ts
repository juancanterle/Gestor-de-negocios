import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  variant?:       'danger' | 'default'
  confirmLabel?:  string
  cancelLabel?:   string
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn>(async () => false)

export const useConfirm = () => useContext(ConfirmContext)
