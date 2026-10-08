// Caja generica: fondo oscuro que cierra al hacer click afuera + panel central.
export function Modal({ title, description, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/20" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        {children}
      </div>
    </div>
  )
}

// Muestra statusMessage dentro del modal, salvo los mensajes que vienen del
// socket o de la cola (ver "Cosas raras" en el plan: es un filtro fragil).
export function ModalStatusMessage({ statusMessage }) {
  if (
    !statusMessage ||
    statusMessage.startsWith('Conectado') ||
    statusMessage.startsWith('Desconectado') ||
    statusMessage.startsWith('Cola') ||
    statusMessage.startsWith('No se pudo cargar')
  ) {
    return null
  }
  return <p className="text-sm text-amber-300">{statusMessage}</p>
}
