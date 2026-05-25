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
import { AvoidGermsGamePage } from '../../features/games/avoid-germs-game/AvoidGermsGamePage';
import { BankPanicGamePage } from '../../features/games/bank-panic-game/BankPanicGamePage';
import { BreakoutGamePage } from '../../features/games/breakout-game/BreakoutGamePage';
import { CardMemoryGamePage } from '../../features/games/card-memory-game/CardMemoryGamePage';
import { EmojiMatchGamePage } from '../../features/games/emoji-match-game/EmojiMatchGamePage';
import { SlidingPuzzleGamePage } from '../../features/games/sliding-puzzle-game/SlidingPuzzleGamePage';
import { SnakeGamePage } from '../../features/games/snake-game/SnakeGamePage';
import { SnowmenAttackGamePage } from '../../features/games/snowmen-attack-game/SnowmenAttackGamePage';
import { StackerGamePage } from '../../features/games/stacker-game/StackerGamePage';
import { TomGamePage } from '../../features/games/tom-game/TomGamePage';

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
      <Route path={routePaths.bombGame} element={<ProtectedRoute><BombGamePage /></ProtectedRoute>} />
      <Route path={routePaths.avoidGermsGame} element={<ProtectedRoute><AvoidGermsGamePage /></ProtectedRoute>} />
      <Route path={routePaths.bankPanicGame} element={<ProtectedRoute><BankPanicGamePage /></ProtectedRoute>} />
      <Route path={routePaths.breakoutGame} element={<ProtectedRoute><BreakoutGamePage /></ProtectedRoute>} />
      <Route path={routePaths.cardMemoryGame} element={<ProtectedRoute><CardMemoryGamePage /></ProtectedRoute>} />
      <Route path={routePaths.emojiMatchGame} element={<ProtectedRoute><EmojiMatchGamePage /></ProtectedRoute>} />
      <Route path={routePaths.slidingPuzzleGame} element={<ProtectedRoute><SlidingPuzzleGamePage /></ProtectedRoute>} />
      <Route path={routePaths.snakeGame} element={<ProtectedRoute><SnakeGamePage /></ProtectedRoute>} />
      <Route path={routePaths.snowmenAttackGame} element={<ProtectedRoute><SnowmenAttackGamePage /></ProtectedRoute>} />
      <Route path={routePaths.stackerGame} element={<ProtectedRoute><StackerGamePage /></ProtectedRoute>} />
      <Route path={routePaths.tomGame} element={<ProtectedRoute><TomGamePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={routePaths.login} replace />} />
    </Routes>
  );
}
