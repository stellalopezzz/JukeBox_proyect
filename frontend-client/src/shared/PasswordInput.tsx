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
        className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400 transition hover:text-emerald-200"
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  )
}
