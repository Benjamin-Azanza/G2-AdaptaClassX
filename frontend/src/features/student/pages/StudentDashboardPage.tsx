import { Link } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { useAuthStore } from '../../auth/store/authStore';
import { MOCK_STUDENT_PROFILE, studentGamesService } from '../services/student.service';
import { routePaths } from '../../../app/router/routePaths';

// Mock recent activity
const RECENT_MISSIONS = [
  { icon: 'check_circle', bg: 'bg-primary-container', color: 'text-on-primary-container', label: 'Quiz Rápido — Lectura', sub: 'Completado hace 2h', xp: '+50 XP', xpColor: 'text-primary' },
  { icon: 'local_fire_department', bg: 'bg-secondary-container', color: 'text-on-secondary-container', label: 'Racha Diaria', sub: 'Bonus de acceso', xp: '+10 XP', xpColor: 'text-secondary' },
  { icon: 'military_tech', bg: 'bg-tertiary-fixed', color: 'text-on-surface', label: 'Insignia Desbloqueada', sub: 'Lector Explorador', xp: '+100 XP', xpColor: 'text-tertiary' },
];

const BADGES = [
  { icon: 'history_edu', bg: 'bg-primary-fixed-dim', label: 'Historiador', locked: false },
  { icon: 'auto_stories', bg: 'bg-secondary-fixed', label: 'Lector Pro', locked: false },
  { icon: 'science', bg: 'bg-tertiary-fixed-dim', label: 'Explorador', locked: false },
  { icon: 'speed', bg: 'bg-primary-container', label: 'Velocista', locked: false },
  { icon: 'lock', bg: 'bg-surface-variant', label: '???', locked: true },
  { icon: 'lock', bg: 'bg-surface-variant', label: '???', locked: true },
];

export function StudentDashboardPage() {
  const { user } = useAuthStore();
  const profile = MOCK_STUDENT_PROFILE;
  // TODO: reemplazar por llamada a API cuando el backend esté listo
  const games = studentGamesService.getAvailableGames();
  const firstName = user?.nombre?.split(' ')[0] ?? 'Estudiante';
  const xpProgress = (profile.xp % 1000) / 10;
  const xpToNext = 1000 - (profile.xp % 1000);

  return (
    <StudentShell title="Mi Panel">
      {/* ── Hero: Character + XP ── */}
      <section className="mb-lg grid grid-cols-1 items-stretch gap-lg md:grid-cols-3">
        {/* Character card */}
        <div className="col-span-2 flex flex-col gap-md border-4 border-on-background bg-surface-container p-lg shadow-[8px_8px_0_0_#1d1c17] md:flex-row md:items-center">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="flex h-32 w-32 items-center justify-center border-4 border-on-background bg-primary shadow-[8px_8px_0_0_#1d1c17]">
              <span className="font-headline text-5xl font-bold text-on-primary">
                {firstName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-4 -right-4 border-2 border-on-background bg-tertiary px-sm py-xs font-headline text-sm font-bold text-on-tertiary shadow-[4px_4px_0_0_#1d1c17]">
              LVL {profile.nivel}
            </div>
          </div>

          {/* XP Info */}
          <div className="flex-1">
            <div className="mb-xs flex items-end justify-between">
              <div>
                <p className="font-mono text-xs uppercase text-on-surface-variant">{profile.titulo}</p>
                <h2 className="font-headline text-3xl font-bold uppercase">Hola, {firstName}!</h2>
              </div>
              <p className="font-mono text-sm font-bold text-on-surface-variant">{profile.xp} / {profile.xp + xpToNext} XP</p>
            </div>
            <div className="h-6 w-full overflow-hidden border-4 border-on-background bg-surface-container-lowest p-1">
              <div className="h-full bg-primary border-r-4 border-on-background transition-all" style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="mt-xs text-sm text-on-surface-variant italic">
              Te faltan {xpToNext} XP para alcanzar el nivel {profile.nivel + 1}. ¡Sigue jugando!
            </p>
            {profile.paralelo && (
              <div className="mt-sm flex items-center gap-xs border-2 border-on-background bg-surface-container-lowest px-sm py-xs w-fit">
                <span className="material-symbols-outlined text-sm text-primary">school</span>
                <span className="font-mono text-xs font-bold uppercase">{profile.paralelo.nombre} · Grado {profile.paralelo.grado}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-lg md:grid-cols-1">
          <div className="flex flex-col items-center justify-center border-4 border-on-background bg-secondary-container p-md text-center shadow-[8px_8px_0_0_#1d1c17]">
            <span className="material-symbols-outlined text-4xl mb-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <h4 className="font-headline text-4xl font-bold">{games.length}</h4>
            <p className="font-mono text-xs uppercase text-on-surface-variant">Juegos</p>
          </div>
          <div className="flex flex-col items-center justify-center border-4 border-on-background bg-tertiary-fixed p-md text-center shadow-[8px_8px_0_0_#1d1c17]">
            <span className="material-symbols-outlined text-4xl mb-xs text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <h4 className="font-headline text-4xl font-bold">{profile.racha}</h4>
            <p className="font-mono text-xs uppercase text-on-surface-variant">Racha días</p>
          </div>
        </div>
      </section>

      {/* ── Middle row: Trophies + Recent Missions ── */}
      <section className="mb-lg grid grid-cols-1 gap-lg lg:grid-cols-12">
        {/* Trophy Room */}
        <div className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17] lg:col-span-7">
          <div className="mb-md flex items-center justify-between border-b-2 border-on-background pb-sm">
            <h3 className="font-headline text-xl font-bold uppercase">Sala de Trofeos</h3>
            <span className="font-mono text-xs text-on-surface-variant uppercase">{BADGES.filter(b => !b.locked).length}/{BADGES.length} desbloqueados</span>
          </div>
          <div className="flex flex-wrap gap-md">
            {BADGES.map((badge, i) => (
              <div key={i} className={`flex flex-col items-center gap-xs group ${badge.locked ? 'opacity-40 grayscale' : ''}`}>
                <div className={`h-16 w-16 rounded-full border-2 border-on-background ${badge.bg} flex items-center justify-center shadow-[4px_4px_0_0_#1d1c17] transition-transform group-hover:-translate-y-1`}>
                  <span className="material-symbols-outlined text-2xl">{badge.icon}</span>
                </div>
                <span className="max-w-[64px] text-center font-mono text-[10px] font-bold uppercase leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Missions */}
        <div className="border-4 border-on-background bg-surface-container p-md shadow-[8px_8px_0_0_#1d1c17] lg:col-span-5">
          <div className="mb-md flex items-center gap-sm border-b-2 border-on-background pb-sm">
            <span className="material-symbols-outlined">list_alt</span>
            <h3 className="font-headline text-xl font-bold uppercase">Misiones Recientes</h3>
          </div>
          <div className="space-y-sm">
            {RECENT_MISSIONS.map((m, i) => (
              <div key={i} className="flex items-center justify-between border-2 border-on-background bg-surface-container-lowest p-sm shadow-[4px_4px_0_0_#1d1c17]">
                <div className="flex items-center gap-sm">
                  <div className={`${m.bg} border border-on-background p-xs`}>
                    <span className={`material-symbols-outlined ${m.color}`}>{m.icon}</span>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold uppercase">{m.label}</p>
                    <p className="text-xs text-on-surface-variant">{m.sub}</p>
                  </div>
                </div>
                <p className={`font-headline text-lg font-bold ${m.xpColor}`}>{m.xp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Games Carousel ── */}
      <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
        <div className="mb-md flex items-center justify-between border-b-2 border-on-background pb-sm">
          <h3 className="font-headline text-xl font-bold uppercase">Juegos Disponibles</h3>
          <Link to={routePaths.studentGames} className="font-mono text-xs font-bold uppercase text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <Link
              key={game.id}
              to={game.locked ? '#' : game.route}
              onClick={game.locked ? (e) => e.preventDefault() : undefined}
              className={`group relative flex flex-col border-4 border-on-background bg-surface-container shadow-[8px_8px_0_0_#1d1c17] ${
                game.locked
                  ? 'cursor-not-allowed opacity-50 grayscale'
                  : 'transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]'
              }`}
            >
              <div className="relative h-36 overflow-hidden border-b-4 border-on-background bg-primary-fixed">
                {game.imageUrl ? (
                  <img src={game.imageUrl} alt={game.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="material-symbols-outlined text-[56px] text-primary">stadia_controller</span>
                  </div>
                )}
                {game.locked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="material-symbols-outlined text-[40px] text-white">lock</span>
                  </div>
                ) : (
                  <span className="absolute left-sm top-sm border-2 border-on-background bg-secondary px-sm py-xs font-mono text-xs font-bold uppercase text-on-secondary">
                    {game.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-sm">
                <h4 className="font-headline text-base font-bold leading-tight">{game.title}</h4>
                <p className="mt-xs flex-1 text-xs text-on-surface-variant">{game.description}</p>
                {!game.locked && (
                  <div className="mt-sm flex items-center gap-xs font-mono text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    Jugar ahora
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA Bottom Row ── */}
      <section className="mt-lg flex flex-wrap justify-center gap-md">
        <Link
          to={routePaths.studentGames}
          className="flex items-center gap-sm border-4 border-on-background bg-surface-container-lowest px-xl py-md font-headline text-lg font-bold uppercase shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">storefront</span>
          Ver Catálogo
        </Link>
        <Link
          to={routePaths.studentTasks}
          className="flex items-center gap-sm border-4 border-on-background bg-primary px-xl py-md font-headline text-lg font-bold uppercase text-on-primary shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          Mis Tareas
        </Link>
      </section>
    </StudentShell>
  );
}
