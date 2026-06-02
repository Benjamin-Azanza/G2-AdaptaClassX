import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { useAuthStore } from '../../auth/store/authStore';
import { routePaths } from '../../../app/router/routePaths';
import api from '../../../services/api';

interface GameSessionDetail {
  id: string;
  minutos_jugados: string | number;
  preguntas_correctas: number;
  preguntas_intentadas: number;
  game: {
    id: string;
    titulo: string;
    descripcion: string | null;
    tema: string;
  };
}

/**
 * Shown after the student completes a game session. Looks up the session
 * in /game-sessions/:id to show statistics, and re-hydrates the auth user
 * so the header shows the new totals.
 */
export function StudentResultPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const hydrate = useAuthStore((state) => state.hydrate);
  const { user } = useAuthStore();
  const [session, setSession] = useState<GameSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Snapshot XP before /auth/me refresh so we can render the delta cleanly
  const previousXp = useMemo(() => user?.puntos_xp ?? 0, [user?.puntos_xp]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Re-pull /auth/me to refresh XP + racha in the global store. The
        // header in StudentShell reads from the store so it updates live.
        await hydrate();
      } catch {
        // If hydrate fails the result screen still works — just no XP delta.
      }
      if (sessionId) {
        try {
          const res = await api.get<GameSessionDetail>(`/game-sessions/${sessionId}`);
          if (mounted) {
            setSession(res.data);
          }
        } catch (error) {
          console.error('Failed to load session details', error);
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, hydrate]);

  if (loading) {
    return (
      <StudentShell title="¡Buen trabajo!">
        <div className="flex h-64 items-center justify-center">
          <p className="font-headline text-xl text-on-surface-variant">Cargando resultado...</p>
        </div>
      </StudentShell>
    );
  }

  const currentXp = user?.puntos_xp ?? previousXp;
  const xpEarned = Math.max(0, currentXp - previousXp);

  return (
    <StudentShell title="¡Buen trabajo!">
      <section className="mx-auto max-w-xl border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[8px_8px_0_0_#1d1c17]">
        <span
          className="material-symbols-outlined text-[96px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>
        <h2 className="mt-md font-headline text-3xl font-bold uppercase md:text-5xl">
          {xpEarned > 0 ? '¡Misión Completada!' : '¡Buen intento!'}
        </h2>
        {session && (
          <p className="mt-sm text-base text-on-surface-variant md:text-lg">
            Jugaste a: <strong>{session.game.titulo}</strong>
          </p>
        )}

        <div className="mt-lg grid grid-cols-2 gap-md">
          <div className="border-4 border-on-background bg-primary-container p-md text-on-primary-container">
            <p className="font-mono text-xs uppercase">XP ganado</p>
            <p className="mt-xs font-headline text-3xl font-bold md:text-5xl">+{xpEarned}</p>
          </div>
          <div className="border-4 border-on-background bg-secondary-container p-md text-on-secondary-container">
            <p className="font-mono text-xs uppercase">XP total</p>
            <p className="mt-xs font-headline text-3xl font-bold md:text-5xl">{currentXp}</p>
          </div>
        </div>

        {session && (
          <div className="mt-lg border-2 border-on-background bg-surface-container p-md text-left">
            <h3 className="font-headline text-lg font-bold uppercase text-primary mb-sm">
              Estadísticas de la partida:
            </h3>
            <ul className="space-y-xs font-mono text-sm">
              <li>
                ⏱️ Tiempo: <strong>{Number(session.minutos_jugados).toFixed(1)}</strong> minutos
              </li>
              <li>
                🎯 Respuestas correctas: <strong>{session.preguntas_correctas}</strong>
              </li>
              <li>
                📝 Preguntas intentadas: <strong>{session.preguntas_intentadas}</strong>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-lg flex flex-col items-stretch justify-center gap-sm md:flex-row">
          <Link
            to={routePaths.studentTasks}
            className="border-4 border-on-background bg-primary px-lg py-md font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            Ver mis misiones
          </Link>
          <Link
            to={routePaths.studentGames}
            className="border-4 border-on-background bg-surface px-lg py-md font-headline text-base font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            Otro juego
          </Link>
        </div>
      </section>
    </StudentShell>
  );
}
