import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { paralelosService } from '../../paralelos/services/paralelos.service';
import type { Paralelo } from '../../paralelos/types/paralelo.types';

export function useParalelos(includeArchived = false) {
  const [paralelos, setParalelos] = useState<Paralelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await paralelosService.getAll(includeArchived);
      setParalelos(response.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los paralelos'));
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) setIsLoading(true);
    });
    paralelosService
      .getAll(includeArchived)
      .then((response) => {
        if (mounted) setParalelos(response.data);
      })
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(getApiErrorMessage(requestError, 'No se pudieron cargar los paralelos'));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [includeArchived]);

  return { paralelos, isLoading, error, refresh };
}
