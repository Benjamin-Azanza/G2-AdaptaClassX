import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { routePaths } from '../../../app/router/routePaths';
import { useAuthStore } from '../../auth/store/authStore';
import { buildStudentProfile } from '../services/student.service';

interface StudentShellProps {
  title: string;
  children: ReactNode;
}

const navItems = [
  { label: 'Inicio', icon: 'home', to: routePaths.studentDashboard },
  { label: 'Juegos', icon: 'stadia_controller', to: routePaths.studentGames },
  { label: 'Mis Tareas', icon: 'assignment', to: routePaths.studentTasks },
];

export function StudentShell({ title, children }: StudentShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const profile = buildStudentProfile(user);

  const handleLogout = () => {
    logout();
    navigate(routePaths.login);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r-4 border-on-background bg-surface-container-low p-md shadow-[4px_0_0_0_#1d1c17] md:flex">
        <div className="mb-lg">
          <Link
            to={routePaths.studentDashboard}
            className="font-headline text-3xl font-bold uppercase tracking-normal text-primary"
          >
            Adapta Class
          </Link>
          <p className="mt-xs text-sm font-medium uppercase text-on-surface-variant">
            Zona Estudiante
          </p>
        </div>

        <nav className="flex flex-grow flex-col gap-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-base p-sm text-sm font-medium uppercase transition-colors',
                  isActive
                    ? 'border-b-2 border-primary font-bold text-primary'
                    : 'text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container',
                ].join(' ')
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-sm">
          <div className="border-2 border-on-background bg-surface-container-high p-sm">
            <div className="mb-xs flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-on-surface-variant">
                Nivel {profile.nivel}
              </span>
              <span className="font-mono text-xs font-bold text-primary">{profile.xp} XP</span>
            </div>
            <div className="h-3 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(profile.xp % 1000) / 10}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-sm border-2 border-on-background bg-surface-container-high p-sm">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-on-background bg-primary font-headline font-bold text-on-primary">
              {user?.nombre?.slice(0, 2).toUpperCase() ?? 'ES'}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-bold">{user?.nombre ?? 'Estudiante'}</p>
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm text-orange-500">
                  local_fire_department
                </span>
                <span className="font-mono text-xs font-bold text-orange-500">
                  {profile.racha} dias
                </span>
              </div>
            </div>
            <button
              className="material-symbols-outlined text-on-surface-variant hover:text-error"
              onClick={handleLogout}
              title="Cerrar sesion"
              type="button"
            >
              logout
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex w-full items-center justify-between border-b-4 border-on-background bg-surface px-margin-mobile py-base shadow-[0_4px_0_0_#1d1c17] md:pl-[calc(16rem+48px)] md:pr-margin-desktop">
        <h1 className="font-headline text-2xl font-bold uppercase text-primary">{title}</h1>
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs border-2 border-on-background bg-primary-fixed px-sm py-xs md:hidden">
            <span className="material-symbols-outlined text-sm">star</span>
            <span className="font-mono text-sm font-bold">{profile.xp} XP</span>
          </div>
          <div className="flex items-center gap-xs border-2 border-on-background bg-surface-container px-sm py-xs">
            <span className="material-symbols-outlined text-sm text-orange-500">
              local_fire_department
            </span>
            <span className="font-mono text-sm font-bold text-orange-500">{profile.racha}</span>
          </div>
          <button className="material-symbols-outlined p-xs md:hidden" type="button" onClick={handleLogout}>
            logout
          </button>
        </div>
      </header>

      <main className="min-h-screen px-margin-mobile pb-lg pt-[88px] md:ml-64 md:px-lg md:pt-[88px]">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
