import type { ComponentType } from 'react'
import * as AppModule from '../App.jsx'
import { HostPage } from '../views/host/HostPage'
import { VerifyEmailPage } from '../views/verify/VerifyEmailPage'
import { ForgotPasswordPage } from '../views/password/ForgotPasswordPage'
import { ResetPasswordPage } from '../views/password/ResetPasswordPage'

function getHostRoomIdFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '')
  const match = normalized.match(/^\/host\/([^/]+)$/)
  if (!match) return null
  return decodeURIComponent(match[1])
}

export default function Root() {
  const path = window.location.pathname.replace(/\/+$/, '')
  // Paginas a las que llevan los enlaces de los correos
  if (path === '/verificar') return <VerifyEmailPage />
  if (path === '/recuperar') return <ForgotPasswordPage />
  if (path === '/restablecer') return <ResetPasswordPage />
  const roomId = getHostRoomIdFromPathname(window.location.pathname)
  if (roomId) return <HostPage roomId={roomId} />
  const App = (AppModule as { default: ComponentType }).default
  return <App />
}

