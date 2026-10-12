import { useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder?: string
  className?: string
}

// Input de contraseña con un botón (el ojo) para mostrarla u ocultarla.
export function PasswordInput({ value, onChange, autoComplete, placeholder, className }: Props) {
  // false = se ven puntitos, true = se ve el texto
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        // pr-12 deja lugar a la derecha para que el texto no quede debajo del ojo
        className={`${className ?? ''} pr-12`}
      />
      {/* type="button" para que el click no envíe el formulario */}
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 flex text-slate-400 transition hover:text-emerald-200"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

// Íconos dibujados en SVG (sin librería). stroke="currentColor" hace que tomen el color
// del texto del botón, así el hover de Tailwind también los pinta.
// aria-hidden: el lector de pantalla ya lee el aria-label del botón.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// Ojo abierto: se muestra cuando la contraseña está oculta (click = ver)
function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// Ojo tachado: se muestra cuando la contraseña está visible (click = ocultar)
function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}
