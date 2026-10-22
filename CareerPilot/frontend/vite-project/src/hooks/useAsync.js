import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async function when the dependencies change.
 * Returns { data, error, loading, reload }. While reloading, the previous data stays available.
 */
export default function useAsync(fn, deps = []) {
  const [tick, setTick] = useState(0)
  const key = `${JSON.stringify(deps)}#${tick}`
  const [state, setState] = useState({ key: null, data: null, error: null })
  const fnRef = useRef(fn)

  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let cancelled = false
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ key, data: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const loading = state.key !== key

  return { data: state.data, error: loading ? null : state.error, loading, reload }
}
