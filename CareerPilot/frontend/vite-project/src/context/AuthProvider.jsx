import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../api'
import { AuthContext } from './authContext'

export const NOTICE_KEY = 'cp_notice'

export default function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => api.getToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(api.getToken()))
  const [authError, setAuthError] = useState('')

  const logout = useCallback((reason) => {
    api.clearToken()
    setTokenState(null)
    setUser(null)
    setAuthError('')
    setLoading(false)
    if (typeof reason === 'string') window.sessionStorage.setItem(NOTICE_KEY, reason)
  }, [])

  // Any 401 from the API (expired or invalid token) logs the user out everywhere.
  useEffect(() => {
    api.setUnauthorizedHandler(() => logout('Your session expired. Please log in again.'))
  }, [logout])

  const loadUser = useCallback(() => {
    return api
      .me()
      .then((u) => {
        setUser(u)
        setAuthError('')
      })
      .catch((err) => {
        if (!(err.response && err.response.status === 401)) setAuthError(api.errorMessage(err))
      })
      .finally(() => setLoading(false))
  }, [])

  // On first load, restore the session if a token is stored.
  useEffect(() => {
    if (api.getToken()) loadUser()
  }, [loadUser])

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password })
    api.setToken(data.token)
    setTokenState(data.token)
    setUser(data.user)
    setAuthError('')
    setLoading(false)
    return data.user
  }, [])

  const retry = useCallback(() => {
    setLoading(true)
    loadUser()
  }, [loadUser])

  const updateUser = useCallback((nextUser, nextToken) => {
    if (nextToken) {
      api.setToken(nextToken)
      setTokenState(nextToken)
    }
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({ token, user, loading, authError, login, logout, retry, updateUser }),
    [token, user, loading, authError, login, logout, retry, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
