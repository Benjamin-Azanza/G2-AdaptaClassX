import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { TeacherShell } from '../components/TeacherShell';
import { aiService, type GeneratedQuestionPreview } from '../services/ai.service';

export function TeacherQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestionPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string>('');
  const { paraleloId } = useParams();

  const handleGenerate = async (formData: FormData, gameId: string) => {
    try {
      setIsLoading(true);
      setCurrentGameId(gameId);
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
    try {
      await aiService.saveQuestions({
        game_id: currentGameId,
        paralelo_id: paraleloId || '',
        questions,
      });
      alert('Preguntas guardadas exitosamente.');
      setQuestions([]);
    } catch (error) {
      console.error('Error saving questions', error);
      alert('Hubo un error al guardar las preguntas.');
    }
  };

  return (
    <TeacherShell title="IA Docente">
      <div className="grid grid-cols-1 items-start gap-lg md:grid-cols-3">
        <QuestionGenerationForm onSubmit={handleGenerate} isLoading={isLoading} />
        <QuestionPreview questions={questions} onSave={handleSave} />
      </div>
    </TeacherShell>
  );
}
