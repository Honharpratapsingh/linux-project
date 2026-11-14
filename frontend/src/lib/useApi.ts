import { useState, useEffect, useCallback } from 'react';
import { ApiError } from './api';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  apiFn: () => Promise<T>,
  deps: any[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn();
      setData(result);
      return result;
    } catch (err) {
      const apiErr =
        err instanceof ApiError
          ? err
          : new ApiError(0, 'UNKNOWN', (err as Error).message || 'Unexpected error');
      setError(apiErr);
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute, setData };
}

export interface UseMutationResult<TArgs extends any[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useMutation<TArgs extends any[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>
): UseMutationResult<TArgs, TResult> {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(...args);
        return result;
      } catch (err) {
        const apiErr =
          err instanceof ApiError
            ? err
            : new ApiError(0, 'UNKNOWN', (err as Error).message || 'Unexpected error');
        setError(apiErr);
        throw apiErr;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  return { mutate, loading, error, reset };
}
