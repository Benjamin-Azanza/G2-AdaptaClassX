import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { paralelosService } from '../services/paralelos.service';
import type { Paralelo } from '../types/paralelo.types';

export function useParalelos() {
  const [paralelos, setParalelos] = useState<Paralelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadParalelos() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await paralelosService.getAll();

        if (mounted) {
          setParalelos(response.data);
        }
      } catch (requestError: unknown) {
        if (mounted) {
          setError(getApiErrorMessage(requestError, 'No se pudieron cargar los paralelos'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadParalelos();

    return () => {
      mounted = false;
    };
  }, []);

  return { paralelos, isLoading, error };
}
