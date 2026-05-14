import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { studentGamesService } from '../services/student.service';
import type { StudentGame } from '../types/student.types';

const CATEGORIES = ['Lectura', 'Escritura', 'Literatura', 'Lengua y Cultura'];

export function StudentGameCatalogPage() {
  const [games, setGames] = useState<StudentGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentGamesService.getAvailableGames()
      .then((data) => setGames(data))
      .catch((err) => console.error('Failed to load games', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <StudentShell title="Catálogo de Juegos">
        <div className="flex h-64 items-center justify-center">
          <p className="font-headline text-xl text-on-surface-variant">Cargando juegos...</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="Catálogo de Juegos">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-4xl font-bold uppercase">Juegos disponibles</h2>
        <p className="mt-xs text-on-surface-variant">
          Explora todos los juegos educativos. Selecciona uno y empieza a aprender jugando.
        </p>
      </section>

      {CATEGORIES.map((cat) => {
        const catGames = games.filter(
          (g) => g.category.toLowerCase() === cat.toLowerCase(),
        );
        if (catGames.length === 0) return null;
        return (
          <section key={cat} className="mb-xl">
            <div className="mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">category</span>
              <h3 className="font-headline text-2xl font-bold uppercase">{cat}</h3>
            </div>
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {catGames.map((game) => (
                <Link
                  key={game.id}
                  to={game.route}
                  className="group flex flex-col border-4 border-on-background bg-surface-container-lowest shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
                >
                  <div className="relative h-44 overflow-hidden border-b-4 border-on-background bg-primary-fixed">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-[64px] text-primary">stadia_controller</span>
                      </div>
                    )}
                    <span
                      className={`absolute right-sm top-sm border-2 border-on-background px-sm py-xs font-mono text-xs font-bold uppercase ${
                        game.tipo === 'CAMBIANTE'
                          ? 'bg-tertiary text-on-tertiary'
                          : 'bg-secondary text-on-secondary'
                      }`}
                    >
                      {game.tipo === 'CAMBIANTE' ? 'Personalizado' : 'Libre'}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-md">
                    <h4 className="mb-xs font-headline text-xl font-bold">{game.title}</h4>
                    <p className="flex-1 text-sm text-on-surface-variant">{game.description}</p>
                    <div className="mt-md flex items-center justify-between">
                      <span className="font-mono text-xs uppercase text-on-surface-variant">{game.category}</span>
                      <span className="flex items-center gap-xs font-mono text-sm font-bold text-primary">
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        Jugar
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* If no games match any category */}
      {games.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-md border-4 border-dashed border-on-background bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-[64px] text-outline">stadia_controller</span>
          <h3 className="font-headline text-2xl font-bold uppercase">Sin juegos disponibles</h3>
          <p className="text-on-surface-variant">Tu profesor aún no ha habilitado juegos para tu paralelo.</p>
        </div>
      )}
    </StudentShell>
  );
}
