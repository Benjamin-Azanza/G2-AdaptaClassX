import { useState } from 'react';

const questionAmounts = [5, 10, 15];
const contentTargetGames = [
  {
    id: 'bomb-game',
    title: 'Quiz Rapido - Lectura',
  },
];

export function QuestionGenerationForm() {
  const [amount, setAmount] = useState(10);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetGameId, setTargetGameId] = useState(contentTargetGames[0]?.id ?? '');

  return (
    <section className="flex h-fit flex-col gap-md border-2 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] md:col-span-1">
      <div className="border-b-2 border-on-background pb-sm">
        <h2 className="font-headline text-2xl font-bold text-primary">Parametros de generacion</h2>
        <p className="text-on-surface-variant">Configura las opciones para la IA.</p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-sm border-4 border-dashed border-outline-variant bg-surface-variant p-lg text-center transition-colors hover:bg-surface-dim">
        <span className="material-symbols-outlined text-[48px] text-outline">upload_file</span>
        <span className="text-sm font-medium uppercase">
          {uploadedFile ? uploadedFile.name : 'Subir documento base'}
        </span>
        <span className="text-sm text-on-surface-variant">
          {uploadedFile ? 'Archivo cargado solo en memoria' : 'PDF o DOCX, max 10MB'}
        </span>
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Juego destino
        <select
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={targetGameId}
          onChange={(event) => setTargetGameId(event.target.value)}
        >
          {contentTargetGames.map((game) => (
            <option key={game.id} value={game.id}>
              {game.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-sm">
        <label className="text-sm font-bold uppercase">Cantidad de preguntas</label>
        <div className="grid grid-cols-4 gap-sm">
          {questionAmounts.map((value) => (
            <button
              key={value}
              className={[
                'border-2 border-on-background py-2 font-headline text-2xl font-bold shadow-[2px_2px_0_0_#1d1c17] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                amount === value ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-lowest hover:bg-surface-variant',
              ].join(' ')}
              type="button"
              onClick={() => setAmount(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Nivel de dificultad
        <select className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary">
          <option>Basico</option>
          <option>Intermedio</option>
          <option>Avanzado</option>
        </select>
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Contexto adicional
        <textarea
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          placeholder="Ej: Enfocar en comprension lectora, vocabulario o figuras literarias..."
          rows={3}
        />
      </label>

      <button
        className="mt-auto flex w-full items-center justify-center gap-sm border-2 border-on-background bg-primary px-4 py-3 font-headline text-2xl font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={!uploadedFile || !targetGameId}
      >
        <span className="material-symbols-outlined">smart_toy</span>
        Generar
      </button>
    </section>
  );
}
