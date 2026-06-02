import { useEffect, useState, useCallback } from 'react';
import { TeacherShell } from '../components/TeacherShell';
import api from '../../../services/api';

interface QuestionSource {
  id: string;
  filename: string;
  source_hash: string;
  tema: string;
  created_at: string;
  _count: {
    questions: number;
  };
}

interface Question {
  id: string;
  texto: string;
  opciones: string[];
  respuesta_correcta: string;
  tema: string;
  created_at: string;
}

const TEMAS = [
  { value: 'LECTURA', label: 'Lectura' },
  { value: 'ESCRITURA', label: 'Escritura' },
  { value: 'LITERATURA', label: 'Literatura' },
  { value: 'LENGUA_CULTURA', label: 'Lengua y Cultura' },
  { value: 'COMUNICACION_ORAL', label: 'Comunicación Oral' },
];

export function TeacherBankPage() {
  const [activeTab, setActiveTab] = useState<'sources' | 'questions'>('sources');
  
  // Question sources state
  const [sources, setSources] = useState<QuestionSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [filterTema, setFilterTema] = useState<string>('LECTURA');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const res = await api.get<QuestionSource[]>('/question-sources');
      setSources(res.data);
    } catch (err) {
      setSourcesError('Error al cargar el historial de documentos.');
      console.error(err);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const res = await api.get<Question[]>('/questions', {
        params: { tema: filterTema },
      });
      setQuestions(res.data);
    } catch (err) {
      setQuestionsError('Error al cargar el banco de preguntas.');
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  }, [filterTema]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      if (activeTab === 'sources') {
        fetchSources();
      } else {
        fetchQuestions();
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeTab, fetchSources, fetchQuestions]);

  const handleRegenerate = async (sourceId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post<{ message: string }>(`/question-sources/${sourceId}/regenerate`);
      setActionSuccess(res.data.message);
    } catch (err) {
      setActionError('No se pudo regenerar el documento.');
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta pregunta del banco?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.delete(`/questions/${qId}`);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setActionSuccess('Pregunta eliminada del banco exitosamente.');
    } catch (err) {
      setActionError('No se pudo eliminar la pregunta.');
      console.error(err);
    }
  };

  const getTemaLabel = (val: string) => {
    return TEMAS.find((t) => t.value === val)?.label ?? val;
  };

  return (
    <TeacherShell title="Banco de Preguntas">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-5xl">Banco de Preguntas</h2>
        <p className="mt-xs max-w-3xl text-sm md:text-lg leading-relaxed text-on-surface-variant">
          Gestiona los documentos de lectura que has subido y consulta o elimina preguntas individuales de tu banco global.
        </p>
      </section>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="mb-md border-4 border-on-background p-md bg-primary-container text-on-primary-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-md border-4 border-on-background p-md bg-error-container text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-4 border-on-background mb-lg">
        <button
          onClick={() => setActiveTab('sources')}
          className={[
            'px-6 py-3 font-headline font-bold uppercase border-t-4 border-x-4 border-transparent -mb-1 select-none transition-all',
            activeTab === 'sources'
              ? 'bg-surface border-on-background border-t-primary text-primary translate-y-0.5'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
          ].join(' ')}
        >
          Documentos Base ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={[
            'px-6 py-3 font-headline font-bold uppercase border-t-4 border-x-4 border-transparent -mb-1 select-none transition-all',
            activeTab === 'questions'
              ? 'bg-surface border-on-background border-t-primary text-primary translate-y-0.5'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
          ].join(' ')}
        >
          Preguntas Individuales
        </button>
      </div>

      {activeTab === 'sources' ? (
        <div className="space-y-4">
          {sourcesLoading ? (
            <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17]">
              Cargando historial de documentos...
            </div>
          ) : sourcesError ? (
            <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
              {sourcesError}
            </div>
          ) : sources.length === 0 ? (
            <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
              Aún no has subido ningún documento. Usa el Generador de Preguntas IA para cargar tu primer archivo.
            </div>
          ) : (
            <div className="grid gap-md md:grid-cols-2">
              {sources.map((source) => (
                <article key={source.id} className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17]">
                  <div className="flex justify-between items-start gap-sm">
                    <div>
                      <h4 className="font-headline text-xl font-bold uppercase text-primary break-all">{source.filename}</h4>
                      <span className="inline-block mt-xs border border-on-background bg-primary-fixed px-2.5 py-0.5 text-xs font-bold uppercase text-on-primary-fixed">
                        {getTemaLabel(source.tema)}
                      </span>
                    </div>
                    <span className="shrink-0 border-2 border-on-background bg-secondary-container px-2 py-1 text-xs font-bold uppercase text-on-secondary-container">
                      {source._count.questions} preguntas
                    </span>
                  </div>

                  <p className="mt-md text-xs text-on-surface-variant font-mono truncate">
                    Hash: {source.source_hash}
                  </p>
                  <p className="mt-xs text-xs text-on-surface-variant">
                    Subido el: {new Date(source.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-md pt-md border-t-2 border-on-background flex justify-end">
                    <button
                      onClick={() => handleRegenerate(source.id)}
                      className="border-2 border-on-background bg-surface px-4 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      Regenerar con IA
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-sm mb-md border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17]">
            <label className="flex items-center gap-sm text-sm font-bold uppercase">
              Filtrar por Tema:
              <select
                className="border-2 border-on-background bg-surface px-sm py-1.5 font-normal normal-case shadow-[2px_2px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
                value={filterTema}
                onChange={(e) => setFilterTema(e.target.value)}
              >
                {TEMAS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {questionsLoading ? (
            <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[4px_4px_0_0_#1d1c17]">
              Cargando banco de preguntas...
            </div>
          ) : questionsError ? (
            <div className="border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
              {questionsError}
            </div>
          ) : questions.length === 0 ? (
            <div className="border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center text-on-surface-variant">
              No hay preguntas registradas para este tema en tu banco de preguntas.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="relative border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] flex flex-col md:flex-row gap-md justify-between items-start md:items-center">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-sm">
                      <span className="bg-on-background text-surface text-xs font-bold px-2 py-0.5">
                        Q{idx + 1}
                      </span>
                      <p className="font-bold text-lg text-on-surface">{q.texto}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm pl-6 text-sm">
                      {q.opciones.map((opt, oIdx) => {
                        const isCorrect = opt === q.respuesta_correcta;
                        return (
                          <div
                            key={oIdx}
                            className={[
                              'px-3 py-1.5 border-2',
                              isCorrect
                                ? 'bg-primary-container border-primary font-semibold text-on-primary-container'
                                : 'bg-surface border-on-background/20 text-on-surface-variant',
                            ].join(' ')}
                          >
                            <span className="font-bold mr-1.5">{String.fromCharCode(65 + oIdx)})</span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="shrink-0 border-2 border-error bg-error-container text-on-error-container px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] hover:bg-error hover:text-white transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </TeacherShell>
  );
}
