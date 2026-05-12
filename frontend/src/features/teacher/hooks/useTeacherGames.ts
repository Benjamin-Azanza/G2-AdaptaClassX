import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { gamesService } from '../../games/services/games.service';
import type { TeacherGame } from '../../games/types/game.types';

export function useTeacherGames() {
  const [games, setGames] = useState<TeacherGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadGames() {
      setIsLoading(true);
      setError(null);

      try {
        const teacherGames = await gamesService.getTeacherGames();

        if (mounted) {
          setGames(teacherGames);
        }
      } catch (error: unknown) {
        if (mounted) {
          setError(getApiErrorMessage(error, 'No se pudieron cargar los juegos'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadGames();

    return () => {
      mounted = false;
    };
  }, []);

  return { games, isLoading, error };
}
