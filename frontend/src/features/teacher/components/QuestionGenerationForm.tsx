import { useState } from 'react';

interface QuestionGenerationFormProps {
  onSubmit: (formData: FormData, tema: string) => void;
  isLoading: boolean;
}

const TEMAS = [
  { value: 'LECTURA', label: 'Lectura' },
  { value: 'ESCRITURA', label: 'Escritura' },
  { value: 'LITERATURA', label: 'Literatura' },
  { value: 'LENGUA_CULTURA', label: 'Lengua y Cultura' },
  { value: 'COMUNICACION_ORAL', label: 'Comunicación Oral' },
];

export function QuestionGenerationForm({ onSubmit, isLoading }: QuestionGenerationFormProps) {
  const [amount, setAmount] = useState(10);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [tema, setTema] = useState('LECTURA');
  const [difficulty, setDifficulty] = useState('Basico');
  const [context, setContext] = useState('');

  const questionAmounts = [5, 10, 15];

  const handleSubmit = () => {
    if (!uploadedFile || !tema) return;

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('tema', tema);
    formData.append('amount', amount.toString());
    formData.append('difficulty', difficulty);
    formData.append('context', context);

    onSubmit(formData, tema);
  };

  return (
    <section className="flex h-fit flex-col gap-md border-2 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] md:col-span-1">
      <div className="border-b-2 border-on-background pb-sm">
        <h2 className="font-headline text-2xl font-bold text-primary">Parámetros de generación</h2>
        <p className="text-on-surface-variant">Configura las opciones para la IA.</p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-sm border-4 border-dashed border-outline-variant bg-surface-variant p-lg text-center transition-colors hover:bg-surface-dim">
        <span className="material-symbols-outlined text-[48px] text-outline">upload_file</span>
        <span className="text-sm font-medium uppercase">
          {uploadedFile ? uploadedFile.name : 'Subir documento base'}
        </span>
        <span className="text-sm text-on-surface-variant">
          {uploadedFile ? 'Archivo cargado en memoria' : 'PDF, DOCX o TXT, max 10MB'}
        </span>
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Tema del material
        <select
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={tema}
          onChange={(event) => setTema(event.target.value)}
        >
          {TEMAS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-sm">
        <label className="text-sm font-bold uppercase">Cantidad de preguntas</label>
        <div className="grid grid-cols-3 gap-sm">
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
        <select 
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="Basico">Basico</option>
          <option value="Intermedio">Intermedio</option>
          <option value="Avanzado">Avanzado</option>
        </select>
      </label>

      <label className="flex flex-col gap-sm text-sm font-bold uppercase">
        Contexto adicional (opcional)
        <textarea
          className="rounded-none border-2 border-on-background bg-surface-container-lowest p-3 font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          placeholder="Ej: Enfocar en comprensión lectora, vocabulario o figuras literarias..."
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </label>

      <button
        className="mt-auto flex w-full items-center justify-center gap-sm border-2 border-on-background bg-primary px-4 py-2.5 font-headline text-lg md:text-2xl font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={!uploadedFile || !tema || isLoading}
        onClick={handleSubmit}
      >
        <span className="material-symbols-outlined">smart_toy</span>
        {isLoading ? 'Generando...' : 'Generar'}
      </button>
    </section>
  );
}
