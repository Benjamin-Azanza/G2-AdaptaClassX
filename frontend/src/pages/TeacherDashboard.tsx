import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { paralelosService, type Paralelo } from '../services/paralelos.service';
import './Dashboard.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [paralelos, setParalelos] = useState<Paralelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: '', grado: 3 });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const initials = user.nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    loadParalelos();
  }, []);

  const loadParalelos = async () => {
    try {
      const res = await paralelosService.getAll();
      setParalelos(res.data);
    } catch (err) {
      console.error('Error loading paralelos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      await paralelosService.create(createForm);
      setShowCreateForm(false);
      setCreateForm({ nombre: '', grado: 3 });
      await loadParalelos();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Error al crear paralelo');
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span className="nav-logo">📚</span>
          <span className="nav-title">Adapta Class</span>
        </div>
        <div className="nav-actions">
          <div className="nav-user">
            <div className="avatar teacher-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user.nombre}</span>
              <span className="user-role">Profesor</span>
            </div>
          </div>
          <button className="nav-logout" onClick={logout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="welcome-banner teacher-banner">
          <div className="welcome-text">
            <h1>¡Bienvenido, {user.nombre.split(' ')[0]}! 🎓</h1>
            <p>Panel de control del profesor</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section paralelos-section">
            <div className="section-header">
              <h2>📋 Mis Paralelos</h2>
              <button
                className="create-btn"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? '✕ Cancelar' : '+ Crear Paralelo'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreate} className="create-form">
                {createError && <div className="form-error">{createError}</div>}
                <div className="create-form-row">
                  <input
                    type="text"
                    placeholder="Nombre (ej: 3ro A)"
                    value={createForm.nombre}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nombre: e.target.value })
                    }
                    required
                    className="create-input"
                  />
                  <select
                    value={createForm.grado}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        grado: parseInt(e.target.value),
                      })
                    }
                    className="create-select"
                  >
                    <option value={3}>3ro EGB</option>
                    <option value={4}>4to EGB</option>
                    <option value={5}>5to EGB</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="create-submit"
                  >
                    {isCreating ? '...' : 'Crear'}
                  </button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="loading-state">
                <span className="spinner-lg"></span>
                <p>Cargando paralelos...</p>
              </div>
            ) : paralelos.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No hay paralelos aún. ¡Crea el primero!</p>
              </div>
            ) : (
              <div className="paralelos-grid">
                {paralelos.map((p) => (
                  <div key={p.id} className="paralelo-card">
                    <div className="paralelo-header">
                      <h3>{p.nombre}</h3>
                      <span className="grado-badge">{p.grado}° EGB</span>
                    </div>
                    <div className="paralelo-code">
                      <span className="code-label">Código:</span>
                      <span className="code-value">{p.codigo_acceso}</span>
                      <button
                        className="copy-btn"
                        onClick={() => copyCode(p.codigo_acceso)}
                        title="Copiar código"
                      >
                        📋
                      </button>
                    </div>
                    <div className="paralelo-stats">
                      <span>
                        👥 {p._count?.students || 0} estudiantes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section">
            <h2>📊 Actividades Recientes</h2>
            <div className="coming-soon">
              <span className="cs-icon">📈</span>
              <p>Las estadísticas estarán disponibles próximamente</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
