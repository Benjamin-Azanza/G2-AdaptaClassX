import { Link } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { studentAssignmentsService } from '../services/student.service';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function StudentTasksPage() {
  // TODO: cuando haya backend, reemplazar por useEffect + estado + studentAssignmentsService.getPending()
  const pending = studentAssignmentsService.getPending();
  const completed = studentAssignmentsService.getCompleted();

  return (
    <StudentShell title="Mis Tareas">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-4xl font-bold uppercase">Mis Tareas</h2>
        <p className="mt-xs text-on-surface-variant">
          Aquí aparecen las actividades que tu profesor ha asignado a tu clase.
        </p>
      </section>

      {/* ── Pendientes ── */}
      <div className="mb-xl">
        <h3 className="mb-md font-headline text-2xl font-bold uppercase">Pendientes</h3>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center">
            <span className="material-symbols-outlined text-[48px] text-outline">task_alt</span>
            <p className="font-mono text-sm uppercase text-on-surface-variant">
              ¡No tienes tareas pendientes!
            </p>
          </div>
        ) : (
          <div className="space-y-md">
            {pending.map((task) => {
              const progress = Math.min(
                (task.minutosJugados / task.minutosRequeridos) * 100,
                100,
              );
              return (
                <div
                  key={task.id}
                  className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]"
                >
                  <div className="flex flex-col gap-sm md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-sm">
                        <span className="border-2 border-on-background bg-secondary px-sm py-xs font-mono text-xs font-bold uppercase text-on-secondary">
                          {task.gameCategory}
                        </span>
                        <span className="border-2 border-yellow-600 bg-yellow-100 px-sm py-xs font-mono text-xs font-bold uppercase text-yellow-800">
                          En progreso
                        </span>
                      </div>
                      <h4 className="mt-sm font-headline text-xl font-bold">{task.gameTitle}</h4>
                      <p className="text-sm text-on-surface-variant">
                        Tiempo requerido:{' '}
                        <strong>{task.minutosRequeridos} min</strong> · Vence el{' '}
                        {formatDate(task.fechaLimite)}
                      </p>
                    </div>
                    {/* Botón que navega al juego real */}
                    <Link
                      to={task.gameRoute}
                      className="flex items-center gap-xs border-4 border-on-background bg-primary px-lg py-sm font-headline font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                      Jugar
                    </Link>
                  </div>

                  {/* Barra de progreso de tiempo */}
                  <div className="mt-md">
                    <div className="mb-xs flex justify-between text-sm font-bold">
                      <span>Progreso de tiempo</span>
                      <span>
                        {task.minutosJugados}/{task.minutosRequeridos} min
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Completadas ── */}
      <div>
        <h3 className="mb-md font-headline text-2xl font-bold uppercase">Completadas</h3>
        {completed.length === 0 ? (
          <p className="text-on-surface-variant">Aún no has completado ninguna tarea.</p>
        ) : (
          <div className="space-y-sm">
            {completed.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between border-2 border-on-background bg-surface-container p-sm shadow-[4px_4px_0_0_#1d1c17]"
              >
                <div className="flex items-center gap-sm">
                  <div className="border border-on-background bg-primary-container p-xs">
                    <span className="material-symbols-outlined text-on-primary-container">
                      check_circle
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold uppercase">{task.gameTitle}</p>
                    <p className="text-xs text-on-surface-variant">
                      Completado el {task.completadoAt ? formatDate(task.completadoAt) : '—'}
                    </p>
                  </div>
                </div>
                {task.xpGanado !== undefined && (
                  <p className="font-headline text-lg font-bold text-primary">
                    +{task.xpGanado} XP
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
