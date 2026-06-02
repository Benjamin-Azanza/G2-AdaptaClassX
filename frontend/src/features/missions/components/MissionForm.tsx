import { useState } from 'react';
import { missionsService } from '../services/missions.service';

interface MissionFormProps {
  paraleloId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

type MissionType = 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';

export function MissionForm({ paraleloId, onSuccess, onCancel }: MissionFormProps) {
  const [tipo, setTipo] = useState<MissionType>('PLAY_TIME');
  const [goalValue, setGoalValue] = useState<number>(15);
  const [fechaLimite, setFechaLimite] = useState<string>(() => {
    // Default to 7 days in the future, formatted for datetime-local (YYYY-MM-DDTHH:MM)
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 0, 0);
    return date.toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (goalValue <= 0) {
        throw new Error('El objetivo debe ser mayor a 0');
      }
      if (new Date(fechaLimite) <= new Date()) {
        throw new Error('La fecha límite debe ser en el futuro');
      }

      await missionsService.create({
        paralelo_id: paraleloId,
        tipo,
        goal_value: goalValue,
        fecha_limite: new Date(fechaLimite).toISOString(),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la misión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl text-white">
      <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
        Nueva Misión para la Clase
      </h3>

      {error && (
        <div className="p-3 text-sm rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Tipo de Objetivo
        </label>
        <select
          value={tipo}
          onChange={(e) => {
            const val = e.target.value as MissionType;
            setTipo(val);
            // Set sensible default goals
            if (val === 'PLAY_TIME') setGoalValue(15);
            else if (val === 'PLAY_DISTINCT') setGoalValue(3);
            else if (val === 'ANSWER_CORRECT') setGoalValue(10);
          }}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="PLAY_TIME">Tiempo total de juego (minutos)</option>
          <option value="PLAY_DISTINCT">Jugar diferentes juegos</option>
          <option value="ANSWER_CORRECT">Preguntas respondidas correctamente</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {tipo === 'PLAY_TIME' && 'Minutos requeridos'}
          {tipo === 'PLAY_DISTINCT' && 'Cantidad de juegos distintos'}
          {tipo === 'ANSWER_CORRECT' && 'Preguntas correctas requeridas'}
        </label>
        <input
          type="number"
          min="1"
          value={goalValue}
          onChange={(e) => setGoalValue(parseInt(e.target.value, 10) || 0)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Fecha y Hora Límite
        </label>
        <input
          type="datetime-local"
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Asignando...
            </>
          ) : (
            'Asignar Misión'
          )}
        </button>
      </div>
    </form>
  );
}
