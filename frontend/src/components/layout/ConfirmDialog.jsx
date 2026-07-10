import Modal from './Modal';

export default function ConfirmDialog({
  titulo = 'Confirmar',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
  procesando = false,
  error = '',
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal titulo={titulo} onClose={onCancelar}>
      <p className="text-sm text-gray-600">{mensaje}</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={procesando}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
            peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'
          }`}
        >
          {procesando ? 'Procesando...' : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
