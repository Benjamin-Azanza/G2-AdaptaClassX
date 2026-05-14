import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routePaths } from '../../../app/router/routePaths';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    cedula: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError('');

    if (form.password !== form.confirmPassword) {
      setValidationError('Las contrasenas no coinciden');
      return;
    }

    if (form.password.length < 6) {
      setValidationError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        cedula: form.cedula.trim() || undefined,
      });
      navigate(routePaths.login);
    } catch {
      // The store exposes the error for the form.
    }
  };

  const formError = error || validationError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-margin-mobile py-lg">
      <section className="w-full max-w-2xl border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
        <div className="mb-md border-b-4 border-on-background pb-md">
          <Link to={routePaths.home} className="font-headline text-2xl font-bold uppercase text-primary">
            Adapta Class
          </Link>
          <p className="mt-xs text-on-surface-variant">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-md md:grid-cols-2">
          {formError && (
            <button
              type="button"
              onClick={() => {
                clearError();
                setValidationError('');
              }}
              className="border-2 border-on-background bg-error-container p-sm text-left text-on-error-container md:col-span-2"
            >
              {formError}
            </button>
          )}

          <label className="flex flex-col gap-xs text-sm font-bold uppercase md:col-span-2">
            Nombre completo
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              placeholder="Juan Perez"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase md:col-span-2">
            Correo electronico
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="tu@correo.com"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase">
            Contrasena
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="********"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase">
            Confirmar
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              placeholder="********"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase md:col-span-2">
            Cedula de docente <span className="font-normal normal-case text-on-surface-variant">(opcional)</span>
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              value={form.cedula}
              onChange={(event) => setForm({ ...form, cedula: event.target.value })}
              placeholder="1712345678"
            />
            <span className="font-normal normal-case text-on-surface-variant">
              Si eres docente, ingresa tu cedula autorizada para obtener acceso de profesor.
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="border-2 border-on-background bg-primary px-md py-sm font-headline text-lg font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-wait disabled:opacity-70 md:col-span-2"
          >
            {isLoading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-md text-center text-sm text-on-surface-variant">
          Ya tienes cuenta?{' '}
          <Link className="font-bold text-primary underline" to={routePaths.login}>
            Inicia sesion
          </Link>
        </p>
      </section>
    </main>
  );
}
