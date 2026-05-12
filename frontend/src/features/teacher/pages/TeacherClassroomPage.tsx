import { useState } from 'react';
import type { FormEvent } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { TeacherShell } from '../components/TeacherShell';
import { useParalelos } from '../hooks/useParalelos';
import { paralelosService } from '../services/paralelos.service';

function formatGrade(grade: number) {
  const labels: Record<number, string> = {
    3: '3ro EGB',
    4: '4to EGB',
    5: '5to EGB',
  };

  return labels[grade] ?? `${grade} EGB`;
}

export function TeacherClassroomPage() {
  const { paralelos, isLoading, error } = useParalelos();
  const [copiedCode, setCopiedCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ nombre: '', grado: 3 });

  const copyAccessCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
  };

  const createParalelo = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      await paralelosService.create(form);
      window.location.reload();
    } catch (requestError: unknown) {
      setCreateError(getApiErrorMessage(requestError, 'No se pudo crear el paralelo'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TeacherShell title="Aula">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-4xl font-bold uppercase tracking-normal md:text-5xl">Paralelos</h2>
        <p className="mt-xs max-w-3xl text-lg leading-relaxed text-on-surface-variant">
          Administra tus cursos y comparte codigos de acceso para que los estudiantes se unan desde su dashboard.
        </p>
      </section>

      <form onSubmit={createParalelo} className="mb-lg grid gap-sm border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17] md:grid-cols-[1fr_180px_auto]">
        <label className="flex flex-col gap-xs text-sm font-bold uppercase">
          Nombre del paralelo
          <input
            className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
            value={form.nombre}
            onChange={(event) => setForm({ ...form, nombre: event.target.value })}
            placeholder="Ej: 3ro A"
            required
          />
        </label>
        <label className="flex flex-col gap-xs text-sm font-bold uppercase">
          Grado
          <select
            className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
            value={form.grado}
            onChange={(event) => setForm({ ...form, grado: Number(event.target.value) })}
          >
            <option value={3}>3ro EGB</option>
            <option value={4}>4to EGB</option>
            <option value={5}>5to EGB</option>
          </select>
        </label>
        <button
          className="self-end border-2 border-on-background bg-primary px-md py-2 font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] disabled:opacity-60"
          type="submit"
          disabled={isCreating}
        >
          {isCreating ? 'Creando' : 'Crear paralelo'}
        </button>
        {createError && <p className="text-sm font-bold text-error md:col-span-3">{createError}</p>}
      </form>

      {isLoading && (
        <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[8px_8px_0_0_#1d1c17]">
          Cargando paralelos
        </div>
      )}

      {error && !isLoading && (
        <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[8px_8px_0_0_#1d1c17]">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-md md:grid-cols-2">
          {paralelos.map((paralelo) => (
            <article key={paralelo.id} className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
              <div className="flex items-start justify-between gap-sm">
                <div>
                  <h3 className="font-headline text-2xl font-bold uppercase text-primary">{paralelo.nombre}</h3>
                  <p className="text-on-surface-variant">{formatGrade(paralelo.grado)}</p>
                </div>
                <span className="border-2 border-on-background bg-primary-fixed px-sm py-xs text-sm font-bold uppercase text-on-primary-fixed">
                  {paralelo.activo ? 'Activo' : 'Archivado'}
                </span>
              </div>

              <div className="mt-md border-2 border-on-background bg-surface-container-low p-sm">
                <p className="text-xs font-bold uppercase text-on-surface-variant">Codigo de acceso</p>
                <div className="mt-xs flex items-center justify-between gap-sm">
                  <code className="font-headline text-3xl font-bold">{paralelo.codigo_acceso}</code>
                  <button
                    className="border-2 border-on-background bg-background px-sm py-xs text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                    type="button"
                    onClick={() => copyAccessCode(paralelo.codigo_acceso)}
                  >
                    {copiedCode === paralelo.codigo_acceso ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <p className="mt-md text-sm font-medium text-on-surface-variant">
                {paralelo._count?.students ?? 0} estudiantes registrados
              </p>
            </article>
          ))}
        </div>
      )}
    </TeacherShell>
  );
}
