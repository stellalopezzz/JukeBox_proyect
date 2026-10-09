import type { ComponentType } from 'react'
import * as AppModule from '../App.jsx'
import { HostPage } from '../views/host/HostPage'
import { VerifyEmailPage } from '../views/verify/VerifyEmailPage'

function getHostRoomIdFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '')
  const match = normalized.match(/^\/host\/([^/]+)$/)
  if (!match) return null
  return decodeURIComponent(match[1])
}

export default function Root() {
  // El enlace del correo de verificacion apunta a /verificar?token=...
  if (window.location.pathname.replace(/\/+$/, '') === '/verificar') return <VerifyEmailPage />
  const roomId = getHostRoomIdFromPathname(window.location.pathname)
  if (roomId) return <HostPage roomId={roomId} />
  const App = (AppModule as { default: ComponentType }).default
  return <App />
}

