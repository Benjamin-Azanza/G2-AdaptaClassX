import { useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { TeacherShell } from '../components/TeacherShell';
import { aiService, type GeneratedQuestionPreview } from '../services/ai.service';
import { useParalelos } from '../hooks/useParalelos';
import { useTeacherGames } from '../hooks/useTeacherGames';
import { ManualQuestionForm } from '../components/ManualQuestionForm';

type Banner = { kind: 'success' | 'error'; message: string } | null;

export function TeacherQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestionPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string>('');
  const [selectedParaleloId, setSelectedParaleloId] = useState<string>('');
  const [banner, setBanner] = useState<Banner>(null);
  const { paralelos } = useParalelos();
  const { games, isLoading: gamesLoading } = useTeacherGames();

  const handleGenerate = async (formData: FormData, gameId: string, paraleloId: string) => {
    setBanner(null);
    setIsLoading(true);
    setCurrentGameId(gameId);
    setSelectedParaleloId(paraleloId);
    try {
      const generatedQuestions = await aiService.generateQuestions(formData);
      setQuestions(generatedQuestions);
    } catch (error: unknown) {
      console.error('Error generating questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al generar las preguntas.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedParaleloId) {
      setBanner({ kind: 'error', message: 'Selecciona un paralelo antes de guardar.' });
      return;
    }
    setBanner(null);
    try {
      await aiService.saveQuestions({
        game_id: currentGameId,
        paralelo_id: selectedParaleloId,
        questions,
      });
      setBanner({ kind: 'success', message: 'Preguntas guardadas exitosamente.' });
      setQuestions([]);
    } catch (error: unknown) {
      console.error('Error saving questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al guardar las preguntas.'),
      });
    }
  };

  const handleSaveManual = async (
    targetGameId: string,
    paraleloId: string,
    manualQuestions: { texto: string; opciones: string[]; respuestaCorrecta: number }[],
  ) => {
    setBanner(null);
    try {
      await aiService.saveQuestions({
        game_id: targetGameId,
        paralelo_id: paraleloId,
        questions: manualQuestions,
      });
      setBanner({ kind: 'success', message: 'Preguntas manuales guardadas exitosamente.' });
    } catch (error: unknown) {
      console.error('Error saving manual questions', error);
      setBanner({
        kind: 'error',
        message: getApiErrorMessage(error, 'Hubo un error al guardar las preguntas manuales.'),
      });
    }
  };

  return (
    <TeacherShell title="IA Docente">
      {banner && (
        <div
          className={[
            'mb-md border-4 border-on-background p-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]',
            banner.kind === 'success'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-error-container text-on-error-container',
          ].join(' ')}
          role="status"
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-lg md:grid-cols-3">
        <QuestionGenerationForm
          onSubmit={handleGenerate}
          isLoading={isLoading}
          paralelos={paralelos}
          games={games}
          gamesLoading={gamesLoading}
        />
        <QuestionPreview
          questions={questions}
          onSave={handleSave}
          onQuestionsChange={setQuestions}
        />
      </div>

      <div className="mt-xl">
        <ManualQuestionForm
          onSave={handleSaveManual}
          paralelos={paralelos}
          games={games}
          gamesLoading={gamesLoading}
        />
      </div>
    </TeacherShell>
  );
}
