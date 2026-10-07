import { Modal, ModalStatusMessage } from './Modal'

// Los modales de "Crear sala" y "Unirse a sala" son iguales salvo textos,
// el input y el boton: este componente arma esa estructura comun.
export function RoomFormModal({
  title,
  description,
  label,
  value,
  onValueChange,
  placeholder,
  maxLength,
  statusMessage,
  submitting,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
  onClose,
}) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <label className="block text-sm text-slate-300">
          {label}
          <input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-500/20"
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
        </label>

        <ModalStatusMessage statusMessage={statusMessage} />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-3xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="flex-1 rounded-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
