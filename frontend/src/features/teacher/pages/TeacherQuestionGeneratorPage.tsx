import { QuestionGenerationForm } from '../components/QuestionGenerationForm';
import { QuestionPreview } from '../components/QuestionPreview';
import { TeacherShell } from '../components/TeacherShell';

export function TeacherQuestionGeneratorPage() {
  return (
    <TeacherShell title="IA Docente">
      <div className="grid grid-cols-1 items-start gap-lg md:grid-cols-3">
        <QuestionGenerationForm />
        <QuestionPreview />
      </div>
    </TeacherShell>
  );
}
