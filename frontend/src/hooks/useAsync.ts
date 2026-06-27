import { useCallback, useEffect, useState } from 'react'

export function useAsync<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const retry = useCallback(() => {
    setIsLoading(true)
    setError(null)
    loader()
      .then(setData)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Something went wrong')
      })
      .finally(() => setIsLoading(false))
  }, [loader])

  useEffect(() => {
    const timer = window.setTimeout(retry, 0)
    return () => window.clearTimeout(timer)
  }, [retry])

  return { data, setData, isLoading, error, retry }
}
