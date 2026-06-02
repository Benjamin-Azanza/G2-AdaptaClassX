import { useEffect, useState, useCallback } from 'react';
import { TeacherShell } from '../components/TeacherShell';
import api from '../../../services/api';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface QuestionSource {
  id: string;
  filename: string;
  source_hash: string;
  tema: string; // legacy classification tag (kept on the wire, hidden in UI)
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

export function TeacherBankPage() {
  const [activeTab, setActiveTab] = useState<'sources' | 'questions'>('sources');

  // Question sources (uploaded documents) state
  const [sources, setSources] = useState<QuestionSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  // Individual questions state. No more `tema` filter — the bank is now
  // global per teacher; every question feeds every game.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const res = await api.get<QuestionSource[]>('/question-sources');
      setSources(res.data);
    } catch (err) {
      setSourcesError(getApiErrorMessage(err, 'Error al cargar el historial de documentos.'));
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const res = await api.get<Question[]>('/questions');
      setQuestions(res.data);
    } catch (err) {
      setQuestionsError(getApiErrorMessage(err, 'Error al cargar el banco de preguntas.'));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

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
      const res = await api.post<{ message: string }>(
        `/question-sources/${sourceId}/regenerate`,
      );
      setActionSuccess(res.data.message);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'No se pudo regenerar el documento.'));
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
      setActionError(getApiErrorMessage(err, 'No se pudo eliminar la pregunta.'));
    }
  };

  return (
    <TeacherShell title="Banco de Preguntas">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-5xl">
          Banco de Preguntas
        </h2>
        <p className="mt-xs max-w-3xl text-sm leading-relaxed text-on-surface-variant md:text-lg">
          Gestiona los documentos que has subido y consulta o elimina preguntas de tu banco. Las
          preguntas guardadas aquí se usan en <strong>todos los juegos</strong> que jueguen tus
          estudiantes.
        </p>
      </section>

      {actionSuccess && (
        <div className="mb-md border-4 border-on-background bg-primary-container p-md text-on-primary-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-md border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-lg flex border-b-4 border-on-background">
        <button
          onClick={() => setActiveTab('sources')}
          className={[
            'select-none border-x-4 border-t-4 border-transparent -mb-1 px-6 py-3 font-headline font-bold uppercase transition-all',
            activeTab === 'sources'
              ? 'translate-y-0.5 border-on-background border-t-primary bg-surface text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
          ].join(' ')}
        >
          Documentos Base ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={[
            'select-none border-x-4 border-t-4 border-transparent -mb-1 px-6 py-3 font-headline font-bold uppercase transition-all',
            activeTab === 'questions'
              ? 'translate-y-0.5 border-on-background border-t-primary bg-surface text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
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
              Aún no has subido ningún documento. Usa el Generador de Preguntas IA para cargar tu
              primer archivo.
            </div>
          ) : (
            <div className="grid gap-md md:grid-cols-2">
              {sources.map((source) => (
                <article
                  key={source.id}
                  className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17]"
                >
                  <div className="flex items-start justify-between gap-sm">
                    <h4 className="break-all font-headline text-xl font-bold uppercase text-primary">
                      {source.filename}
                    </h4>
                    <span className="shrink-0 border-2 border-on-background bg-secondary-container px-2 py-1 text-xs font-bold uppercase text-on-secondary-container">
                      {source._count.questions} preguntas
                    </span>
                  </div>

                  <p className="mt-md truncate font-mono text-xs text-on-surface-variant">
                    Hash: {source.source_hash}
                  </p>
                  <p className="mt-xs text-xs text-on-surface-variant">
                    Subido el: {new Date(source.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-md flex justify-end border-t-2 border-on-background pt-md">
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
              Aún no tienes preguntas en tu banco. Súbelas con el Generador de Preguntas IA o
              agrégalas manualmente.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-mono text-xs uppercase text-on-surface-variant">
                {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} en tu banco
              </p>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="relative flex flex-col items-start justify-between gap-md border-4 border-on-background bg-surface-container-lowest p-md shadow-[4px_4px_0_0_#1d1c17] md:flex-row md:items-center"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-sm">
                      <span className="bg-on-background px-2 py-0.5 text-xs font-bold text-surface">
                        Q{idx + 1}
                      </span>
                      <p className="text-lg font-bold text-on-surface">{q.texto}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-sm pl-6 text-sm sm:grid-cols-2">
                      {q.opciones.map((opt, oIdx) => {
                        const isCorrect = opt === q.respuesta_correcta;
                        return (
                          <div
                            key={oIdx}
                            className={[
                              'border-2 px-3 py-1.5',
                              isCorrect
                                ? 'border-primary bg-primary-container font-semibold text-on-primary-container'
                                : 'border-on-background/20 bg-surface text-on-surface-variant',
                            ].join(' ')}
                          >
                            <span className="mr-1.5 font-bold">
                              {String.fromCharCode(65 + oIdx)})
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="shrink-0 border-2 border-error bg-error-container px-3 py-1.5 text-xs font-bold uppercase text-on-error-container shadow-[2px_2px_0_0_#1d1c17] transition-colors hover:bg-error hover:text-white"
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
