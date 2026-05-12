interface GeneratedQuestionPreview {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

interface QuestionPreviewProps {
  questions?: GeneratedQuestionPreview[];
}

export function QuestionPreview({ questions = [] }: QuestionPreviewProps) {
  const hasQuestions = questions.length > 0;

  return (
    <section className="flex flex-col gap-lg md:col-span-2">
      <div className="border-2 border-on-background bg-surface-container-high p-md shadow-[4px_4px_0_0_#1d1c17]">
        <h2 className="font-headline text-2xl font-bold">Vista previa</h2>
        <p className="mt-xs text-on-surface-variant">
          Las preguntas apareceran aqui despues de generar contenido desde un documento.
        </p>
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
          <div className="w-full text-left">
            <div className="mb-md flex justify-end gap-sm">
              <button className="border-2 border-on-background bg-surface-container-lowest p-2 shadow-[2px_2px_0_0_#1d1c17]" type="button" aria-label="Editar pregunta">
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button className="border-2 border-on-background bg-error-container p-2 text-on-error-container shadow-[2px_2px_0_0_#1d1c17]" type="button" aria-label="Eliminar pregunta">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
            <p className="font-headline text-2xl font-bold">{questions[0]?.prompt}</p>
          </div>
        )}
      </div>
    </section>
  );
}
