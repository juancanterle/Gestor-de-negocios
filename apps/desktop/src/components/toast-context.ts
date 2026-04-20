import { createContext, useContext } from 'react'
import type { ToastVariant } from './Toast'

export interface ToastContextValue {
  toast:   (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error:   (message: string) => void
  warning: (message: string) => void
  info:    (message: string) => void
}

export const ToastContext = createContext<ToastContextValue>({
  toast: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {},
})

export const useToast = () => useContext(ToastContext)
