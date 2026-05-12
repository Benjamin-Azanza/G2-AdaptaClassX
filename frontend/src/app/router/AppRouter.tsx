import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthRedirect, ProtectedRoute } from './ProtectedRoute';
import { routePaths } from './routePaths';
import { LandingPage } from '../../features/landing/LandingPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { StudentDashboardPage } from '../../features/student/pages/StudentDashboardPage';
import { StudentGameCatalogPage } from '../../features/student/pages/StudentGameCatalogPage';
import { StudentTasksPage } from '../../features/student/pages/StudentTasksPage';
import { TeacherDashboardPage } from '../../features/teacher/pages/TeacherDashboardPage';
import { TeacherClassroomPage } from '../../features/teacher/pages/TeacherClassroomPage';
import { TeacherQuestionGeneratorPage } from '../../features/teacher/pages/TeacherQuestionGeneratorPage';
import { BombGamePage } from '../../features/games/bomb-game/BombGamePage';

export function AppRouter() {
  return (
    <Routes>
      <Route path={routePaths.home} element={<LandingPage />} />
      <Route
        path={routePaths.login}
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />
      <Route
        path={routePaths.register}
        element={
          <AuthRedirect>
            <RegisterPage />
          </AuthRedirect>
        }
      />
      <Route
        path={routePaths.studentDashboard}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentGames}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentGameCatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentTasks}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentTasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherDashboard}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherQuestions}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherQuestionGeneratorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherClassroom}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherClassroomPage />
          </ProtectedRoute>
        }
      />
      <Route path={routePaths.bombGame} element={<BombGamePage />} />
      <Route path="*" element={<Navigate to={routePaths.login} replace />} />
    </Routes>
  );
}
