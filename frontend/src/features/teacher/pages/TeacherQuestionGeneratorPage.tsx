import { useState } from 'react';
import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { TeacherShell } from '../components/TeacherShell';
import { aiService, type GeneratedQuestionPreview } from '../services/ai.service';
import { useParalelos } from '../hooks/useParalelos';
import { useGames } from '../hooks/useGames';
import { ManualQuestionForm } from '../components/ManualQuestionForm';

export function TeacherQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestionPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string>('');
  const [selectedParaleloId, setSelectedParaleloId] = useState<string>('');
  const { paralelos } = useParalelos();
  const { games, isLoading: gamesLoading } = useGames();

  const handleGenerate = async (formData: FormData, gameId: string, paraleloId: string) => {
    try {
      setIsLoading(true);
      setCurrentGameId(gameId);
      setSelectedParaleloId(paraleloId);
      const generatedQuestions = await aiService.generateQuestions(formData);
      setQuestions(generatedQuestions);
    } catch (error) {
      console.error('Error generating questions', error);
      alert('Hubo un error al generar las preguntas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedParaleloId) {
      alert('Por favor selecciona un paralelo antes de guardar.');
      return;
    }
    try {
      await aiService.saveQuestions({
        game_id: currentGameId,
        paralelo_id: selectedParaleloId,
        questions,
      });
      alert('Preguntas guardadas exitosamente.');
      setQuestions([]);
    } catch (error) {
      console.error('Error saving questions', error);
      alert('Hubo un error al guardar las preguntas.');
    }
  };

  const handleSaveManual = async (targetGameId: string, paraleloId: string, manualQuestions: any[]) => {
    try {
      await aiService.saveQuestions({
        game_id: targetGameId,
        paralelo_id: paraleloId,
        questions: manualQuestions,
      });
      alert('Preguntas manuales guardadas exitosamente.');
    } catch (error) {
      console.error('Error saving manual questions', error);
      alert('Hubo un error al guardar las preguntas manuales.');
    }
  };

  return (
    <TeacherShell title="IA Docente">
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
