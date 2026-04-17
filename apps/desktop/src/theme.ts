// ─── KioscoApp Design System ─────────────────────────────────────────────────
// Tema oscuro azul marino — claro, profesional, optimizado para cajeros

export const T = {
  // Fondos — navy oscuro, no negro puro
  bg:      '#090f1c',   // pantalla principal
  surface: '#0f1829',   // superficies / sidebar
  card:    '#162135',   // tarjetas elevadas
  input:   '#0b1422',   // inputs
  hover:   '#1a2d48',   // hover state

  // Bordes — tinte azul sutil
  border:  '#1c2f4a',
  borderHi:'#3b82f6',

  // Texto — alto contraste
  text:    '#eef2fa',   // blanco cálido
  sub:     '#7a90b0',   // secundario
  faint:   '#364d68',   // muy atenuado

  // Acciones primarias
  primary: '#3b82f6',   // azul claro
  primaryD:'#2563eb',   // hover azul

  // Semánticos — colores claros y distintos
  cash:     '#16a34a',  // VERDE — efectivo (el más visto)
  cashBg:   '#14532d22',
  transfer: '#0ea5e9',  // CELESTE — transferencia
  transferBg:'#0c4a6e22',
  success:  '#22c55e',  // verde success genérico
  successBg:'#14532d22',
  warning:  '#f59e0b',  // amber
  warningBg:'#78350f22',
  danger:   '#ef4444',  // rojo
  dangerBg: '#7f1d1d22',

  // Sidebar
  sidebar:  '#070c18',
  sidebarB: '#12223a',

  // Radios
  r:   '10px',
  rLg: '14px',
  rXl: '18px',
} as const

// Estilos de inputs compartidos
export const inputStyle = (T: typeof import('./theme').T): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: T.r,
  border: `1.5px solid ${T.border}`,
  background: T.input,
  color: T.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
})

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: '#5a7290',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
}

export const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
}
