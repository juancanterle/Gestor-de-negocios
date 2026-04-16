import type { Metadata, Viewport } from 'next'

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
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8fafc' }}>
        {children}
      </body>
    </html>
  )
}
