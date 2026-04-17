import type { Metadata, Viewport } from 'next'
import './tokens.css'

export const metadata: Metadata = {
  title: 'KioscoApp — Dashboard',
  description: 'Panel del dueño',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
