import { useEffect, useState } from 'react';
import { gamesService } from '../../games/services/games.service';
import type { TeacherGame } from '../../games/types/game.types';

export function useGames() {
  const [games, setGames] = useState<TeacherGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const all = await gamesService.getTeacherGames();
        // Only acepta_preguntas_ia games, deduplicated by title
        const seenTitles = new Set<string>();
        const aiGames = all.filter(g => {
          if (!g.aceitaIA) return false;
          const key = g.title.toLowerCase().trim();
          if (seenTitles.has(key)) return false;
          seenTitles.add(key);
          return true;
        });
        if (mounted) setGames(aiGames);
      } catch {
        if (mounted) setError('No se pudieron cargar los juegos');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { games, isLoading, error };
}
