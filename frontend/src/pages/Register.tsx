import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    cedula: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (form.password !== form.confirmPassword) {
      setValidationError('Las contraseñas no coinciden');
      return;
    }

    if (form.password.length < 6) {
      setValidationError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        cedula: form.cedula || undefined,
      });
      const user = useAuthStore.getState().user;
      if (user?.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="auth-card auth-card-register">
        <img src="/landing/loginsignup.png" className="loginsignup-img" alt="Decoración" />
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">📚</span>
            <h1>Adapta Class</h1>
          </div>
          <p className="auth-subtitle">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {(error || validationError) && (
            <div className="auth-error" onClick={() => { clearError(); setValidationError(''); }}>
              <span>⚠️</span> {error || validationError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              type="text"
              placeholder="Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-password">Contraseña</label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirmar</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group cedula-group">
            <label htmlFor="cedula">
              Cédula de docente <span className="optional">(opcional)</span>
            </label>
            <input
              id="cedula"
              type="text"
              placeholder="1712345678"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
            <p className="form-hint">
              Si eres docente, ingresa tu cédula para obtener acceso de profesor.
              Debe estar previamente autorizada en el sistema.
            </p>
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
