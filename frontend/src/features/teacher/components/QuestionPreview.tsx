interface GeneratedQuestionPreview {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

interface QuestionPreviewProps {
  questions?: GeneratedQuestionPreview[];
  onSave?: () => void;
}

export function QuestionPreview({ questions = [], onSave }: QuestionPreviewProps) {
  const hasQuestions = questions.length > 0;

  return (
    <section className="flex flex-col gap-lg md:col-span-2">
      <div className="flex items-center justify-between border-2 border-on-background bg-surface-container-high p-md shadow-[4px_4px_0_0_#1d1c17]">
        <div>
          <h2 className="font-headline text-2xl font-bold">Vista previa</h2>
          <p className="mt-xs text-on-surface-variant">
            Las preguntas apareceran aqui despues de generar contenido desde un documento.
          </p>
        </div>
        {hasQuestions && onSave && (
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-sm border-2 border-on-background bg-primary px-4 py-2 font-headline text-lg font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            <span className="material-symbols-outlined">save</span>
            Guardar
          </button>
        )}
      </div>

      <div className="flex min-h-[420px] flex-col items-center justify-center gap-md border-2 border-on-background bg-surface-container-lowest p-lg text-center shadow-[8px_8px_0_0_#1d1c17]">
        {!hasQuestions ? (
          <>
            <span className="material-symbols-outlined text-[64px] text-outline">hourglass_empty</span>
            <div className="w-full max-w-md px-sm">
              <h3 className="font-headline text-3xl font-bold uppercase">Esperando generacion</h3>
              <p className="mx-auto mt-sm max-w-sm text-base leading-relaxed text-on-surface-variant">
                Sube un documento, elige el juego destino y genera una vista previa antes de guardar.
              </p>
            </div>
            <div className="mt-md w-full max-w-md border-2 border-dashed border-outline-variant bg-surface-container-low p-md text-center text-sm leading-relaxed text-on-surface-variant">
              No hay preguntas cargadas en memoria para revisar.
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col gap-md text-left">
            {questions.map((q, index) => (
              <div key={q.id || index} className="flex flex-col gap-sm border-2 border-on-background p-md">
                <p className="font-headline text-xl font-bold">{index + 1}. {q.prompt}</p>
                <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <div 
                      key={i} 
                      className={`border-2 p-2 ${i === q.correctOptionIndex ? 'border-primary bg-primary/10 font-bold' : 'border-outline-variant'}`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
