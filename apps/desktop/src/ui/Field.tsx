import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { color, radius } from './theme'

interface LabelProps { children: ReactNode; htmlFor?: string; hint?: string; required?: boolean }
export function Label({ children, htmlFor, hint, required }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block', fontSize: 11, letterSpacing: 1,
        color: color.mutedDeep, fontWeight: 700, textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {children}{required && <span style={{ color: color.danger, marginLeft: 4 }}>*</span>}
      {hint && <span style={{ textTransform: 'none', color: color.muted, fontWeight: 400, marginLeft: 8, letterSpacing: 0 }}>{hint}</span>}
    </label>
  )
}

// ───── Input ─────

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  invalid?: boolean
  full?: boolean
}

const inputBase: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: radius.md,
  background: color.surface,
  border: `1px solid ${color.border}`,
  color: color.text,
  fontSize: 14, fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightIcon, invalid, full = true, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  if (leftIcon || rightIcon) {
    return (
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        width: full ? '100%' : undefined,
      }}>
        {leftIcon && (
          <span style={{ position: 'absolute', left: 12, color: color.muted, display: 'flex', pointerEvents: 'none' }}>{leftIcon}</span>
        )}
        <input
          ref={ref}
          onFocus={e => { setFocused(true); onFocus?.(e) }}
          onBlur={e => { setFocused(false); onBlur?.(e) }}
          {...rest}
          style={{
            ...inputBase,
            paddingLeft: leftIcon ? 40 : 14,
            paddingRight: rightIcon ? 40 : 14,
            borderColor: invalid ? color.danger : focused ? color.accent : color.border,
            boxShadow: focused ? `0 0 0 3px ${invalid ? 'rgba(239,68,68,0.2)' : color.accentRing}` : 'none',
            ...style,
          }}
        />
        {rightIcon && (
          <span style={{ position: 'absolute', right: 12, color: color.muted, display: 'flex' }}>{rightIcon}</span>
        )}
      </div>
    )
  }
  return (
    <input
      ref={ref}
      onFocus={e => { setFocused(true); onFocus?.(e) }}
      onBlur={e => { setFocused(false); onBlur?.(e) }}
      {...rest}
      style={{
        ...inputBase,
        borderColor: invalid ? color.danger : focused ? color.accent : color.border,
        boxShadow: focused ? `0 0 0 3px ${invalid ? 'rgba(239,68,68,0.2)' : color.accentRing}` : 'none',
        ...style,
      }}
    />
  )
})

// ───── Select ─────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  full?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { full = true, style, onFocus, onBlur, children, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      ref={ref}
      onFocus={e => { setFocused(true); onFocus?.(e) }}
      onBlur={e => { setFocused(false); onBlur?.(e) }}
      {...rest}
      style={{
        ...inputBase,
        width: full ? '100%' : undefined,
        appearance: 'none',
        paddingRight: 36,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b95a9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        borderColor: focused ? color.accent : color.border,
        boxShadow: focused ? `0 0 0 3px ${color.accentRing}` : 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </select>
  )
})

// ───── Textarea ─────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      ref={ref}
      onFocus={e => { setFocused(true); onFocus?.(e) }}
      onBlur={e => { setFocused(false); onBlur?.(e) }}
      {...rest}
      style={{
        ...inputBase,
        resize: 'vertical',
        minHeight: 70,
        borderColor: invalid ? color.danger : focused ? color.accent : color.border,
        boxShadow: focused ? `0 0 0 3px ${invalid ? 'rgba(239,68,68,0.2)' : color.accentRing}` : 'none',
        ...style,
      }}
    />
  )
})
