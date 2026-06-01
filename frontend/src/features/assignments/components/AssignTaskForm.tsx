import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { assignmentsService } from '../services/assignments.service';
import { gamesService } from '../../games/services/games.service';
import type { TeacherGame } from '../../games/types/game.types';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface AssignTaskFormProps {
  paraleloId: string;
  /** Optional callback so the parent can refresh derived state. */
  onAssigned?: () => void;
}

// Default deadline = 1 week out, formatted for the <input type="date"> control.
function defaultDueDate(): string {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  return next.toISOString().slice(0, 10);
}

export function AssignTaskForm({ paraleloId, onAssigned }: AssignTaskFormProps) {
  const [games, setGames] = useState<TeacherGame[]>([]);
  const [gameId, setGameId] = useState('');
  const [minutos, setMinutos] = useState(10);
  const [fecha, setFecha] = useState(defaultDueDate());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    gamesService
      .getTeacherGames()
      .then((all) => {
        if (!mounted) return;
        // Only "CAMBIANTE" games can host assigned questions — those are the
        // ones a teacher would meaningfully assign.
        const assignable = all.filter((g) => g.aceitaIA);
        setGames(assignable);
        if (assignable.length > 0) setGameId(assignable[0].id);
      })
      .catch(() => {
        if (mounted) setMessage({ kind: 'error', text: 'No se pudieron cargar los juegos.' });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit = useMemo(
    () => Boolean(gameId) && minutos > 0 && fecha.length === 10,
    [gameId, minutos, fecha],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await assignmentsService.create({
        paralelo_id: paraleloId,
        game_id: gameId,
        minutos_requeridos: minutos,
        // Backend expects an ISO datetime — anchor the picked day to midnight UTC.
        fecha_limite: new Date(`${fecha}T00:00:00.000Z`).toISOString(),
      });
      setMessage({ kind: 'success', text: 'Tarea asignada.' });
      setMinutos(10);
      setFecha(defaultDueDate());
      onAssigned?.();
    } catch (error: unknown) {
      setMessage({
        kind: 'error',
        text: getApiErrorMessage(error, 'No se pudo crear la tarea.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-md grid gap-sm border-t-2 border-dashed border-on-background/30 pt-md md:grid-cols-[1fr_120px_140px_auto]">
      <label className="flex flex-col gap-xs text-xs font-bold uppercase">
        Juego
        <select
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={gameId}
          onChange={(event) => setGameId(event.target.value)}
        >
          {games.length === 0 && <option value="">Sin juegos disponibles</option>}
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-xs text-xs font-bold uppercase">
        Minutos
        <input
          type="number"
          min={1}
          max={120}
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={minutos}
          onChange={(event) => setMinutos(Math.max(1, Number(event.target.value)))}
        />
      </label>
      <label className="flex flex-col gap-xs text-xs font-bold uppercase">
        Vence
        <input
          type="date"
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={!canSubmit || isSaving}
        className="self-end border-2 border-on-background bg-primary px-md py-2.5 font-headline text-sm font-bold uppercase text-on-primary shadow-[2px_2px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
      >
        {isSaving ? 'Enviando…' : 'Asignar'}
      </button>
      {message && (
        <p
          className={[
            'col-span-full text-sm font-bold',
            message.kind === 'success' ? 'text-primary' : 'text-error',
          ].join(' ')}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
