import { useEffect, useState, useCallback } from 'react';
import { missionsService } from '../services/missions.service';
import type { Mission, MissionProgressDetail } from '../services/missions.service';

interface MissionsPanelProps {
  paraleloId: string;
  refreshKey?: number;
}

export function MissionsPanel({ paraleloId, refreshKey = 0 }: MissionsPanelProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected mission for student breakdown modal
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detail, setDetail] = useState<MissionProgressDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await missionsService.listForTeacher(paraleloId);
      setMissions(data);
    } catch (err) {
      setError('Error al cargar las misiones del paralelo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [paraleloId]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) fetchMissions();
    });
    return () => {
      mounted = false;
    };
  }, [fetchMissions, refreshKey]);

  const handleDelete = async (missionId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta misión? Se perderá el progreso histórico asociado.')) {
      return;
    }
    try {
      await missionsService.remove(missionId);
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      if (selectedMission?.id === missionId) {
        setSelectedMission(null);
        setDetail(null);
      }
    } catch (err) {
      alert('No se pudo eliminar la misión');
      console.error(err);
    }
  };

  const handleOpenDetail = async (mission: Mission) => {
    setSelectedMission(mission);
    setDetailLoading(true);
    try {
      const data = await missionsService.getProgressDetail(mission.id);
      setDetail(data);
    } catch (err) {
      console.error('Error fetching progress detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    if (tipo === 'PLAY_TIME') return 'Tiempo de Juego';
    if (tipo === 'PLAY_DISTINCT') return 'Juegos Distintos';
    if (tipo === 'ANSWER_CORRECT') return 'Preguntas Correctas';
    return tipo;
  };

  const getGoalLabel = (tipo: string, val: number) => {
    if (tipo === 'PLAY_TIME') return `${val} minutos`;
    if (tipo === 'PLAY_DISTINCT') return `${val} juegos`;
    if (tipo === 'ANSWER_CORRECT') return `${val} respuestas correctas`;
    return val;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-center text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {missions.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2 text-slate-500 block">assignment_late</span>
          <p className="text-sm">No hay misiones asignadas a esta clase todavía.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {missions.map((mission) => {
            const completionPercent = mission.total_students > 0 
              ? Math.round((mission.completed_count / mission.total_students) * 100)
              : 0;

            return (
              <div
                key={mission.id}
                className="relative overflow-hidden p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                        {getTipoLabel(mission.tipo)}
                      </span>
                      <h4 className="text-lg font-bold text-white">
                        Meta: {getGoalLabel(mission.tipo, mission.goal_value)}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleDelete(mission.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 text-red-400 transition-all"
                      title="Eliminar misión"
                    >
                      <span className="material-symbols-outlined text-sm leading-none block">delete</span>
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">calendar_today</span>
                      Límite: {new Date(mission.fecha_limite).toLocaleDateString()} a las {new Date(mission.fecha_limite).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Completado por estudiantes</span>
                      <span>{mission.completed_count} de {mission.total_students} ({completionPercent}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    onClick={() => handleOpenDetail(mission)}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xs">analytics</span>
                    Ver progreso de estudiantes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Student Breakdown */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Desglose de Progreso
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Misión {getTipoLabel(selectedMission.tipo)} • Meta: {getGoalLabel(selectedMission.tipo, selectedMission.goal_value)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedMission(null);
                  setDetail(null);
                }}
                className="p-1 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined block leading-none">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {detailLoading ? (
                <div className="flex justify-center items-center py-12">
                  <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : detail ? (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-semibold text-slate-400 uppercase bg-slate-900/80">
                        <th className="px-4 py-3">Estudiante</th>
                        <th className="px-4 py-3">Progreso</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Completado el</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detail.students.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            No hay estudiantes inscritos en esta clase.
                          </td>
                        </tr>
                      ) : (
                        detail.students.map((student) => (
                          <tr key={student.user_id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">
                              <div>
                                <p>{student.nombre}</p>
                                <p className="text-xxs font-normal text-slate-500">{student.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-mono">
                              {student.current_value} / {detail.goal_value}
                              {detail.tipo === 'PLAY_TIME' && ' min'}
                              {detail.tipo === 'PLAY_DISTINCT' && ' juegos'}
                              {detail.tipo === 'ANSWER_CORRECT' && ' correctas'}
                            </td>
                            <td className="px-4 py-3">
                              {student.completado ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                  <span className="material-symbols-outlined text-xs leading-none">check_circle</span>
                                  Completado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                  <span className="material-symbols-outlined text-xs leading-none">pending</span>
                                  En progreso
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {student.completed_at 
                                ? new Date(student.completed_at).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500">No se pudo cargar el progreso.</p>
              )}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => {
                  setSelectedMission(null);
                  setDetail(null);
                }}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all font-semibold text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
