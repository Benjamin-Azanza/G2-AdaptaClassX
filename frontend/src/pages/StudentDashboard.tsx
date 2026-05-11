import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { paralelosService, type Paralelo } from '../services/paralelos.service';
import './Dashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    setIsJoining(true);

    try {
      await paralelosService.join(joinCode);
      setJoinSuccess('¡Te uniste al paralelo exitosamente!');
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Error al unirse al paralelo');
    } finally {
      setIsJoining(false);
    }
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
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user.nombre}</span>
              <span className="user-role">Estudiante</span>
            </div>
          </div>
          <button className="nav-logout" onClick={logout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="welcome-banner student-banner">
          <div className="welcome-text">
            <h1>¡Hola, {user.nombre.split(' ')[0]}! 👋</h1>
            <p>Bienvenido a tu espacio de aprendizaje</p>
          </div>
          <div className="welcome-stats">
            <div className="stat-card">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">0</span>
              <span className="stat-label">Racha</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">0</span>
              <span className="stat-label">XP</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section join-section">
            <h2>🎓 Unirse a un Paralelo</h2>
            <p className="section-desc">
              Ingresa el código que te dio tu profesor para unirte a tu clase.
            </p>
            <form onSubmit={handleJoin} className="join-form">
              {joinError && <div className="form-error">{joinError}</div>}
              {joinSuccess && <div className="form-success">{joinSuccess}</div>}
              <div className="join-input-row">
                <input
                  type="text"
                  placeholder="Ej: KX7T2M"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="join-input"
                />
                <button
                  type="submit"
                  disabled={isJoining || joinCode.length < 6}
                  className="join-btn"
                >
                  {isJoining ? '...' : 'Unirme'}
                </button>
              </div>
            </form>
          </section>

          <section className="dashboard-section games-section">
            <h2>🎮 Juegos Disponibles</h2>
            <p className="section-desc">
              Explora los juegos educativos y diviértete aprendiendo.
            </p>
            <div className="coming-soon">
              <span className="cs-icon">🚀</span>
              <p>¡Próximamente más contenido!</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
