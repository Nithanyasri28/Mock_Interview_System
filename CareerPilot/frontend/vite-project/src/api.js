import axios from 'axios'

// Every request goes through this one axios instance.
// VITE_API_URL is empty by default, so calls like /api/dashboard are sent to the same site
// and the Vite dev server proxies them to Spring Boot (see vite.config.js).
const TOKEN_KEY = 'cp_token'

export const getToken = () => window.localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => window.localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY)

const http = axios.create({
  baseURL: "https://backend-mis-7pnu.onrender.com",
  timeout: 20000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response && error.response.status
    const url = (error.config && error.config.url) || ''
    const isAuthForm = url.includes('/api/users/login') || url.includes('/api/users/register')
    if (status === 401 && !isAuthForm && onUnauthorized) onUnauthorized()
    return Promise.reject(error)
  },
)

/** Turns any failed request into a short message that is safe to show to the user. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error && error.response && error.response.data
  if (data && typeof data === 'object' && data.message) return data.message
  if (error && error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
  if (error && error.request && !error.response) {
    return 'Cannot reach the CareerPilot server. Check your internet connection and that the backend is running.'
  }
  const status = error && error.response && error.response.status
  if (status >= 500) return 'The server is not responding correctly. Make sure the backend and MySQL are running.'
  return fallback
}

export function fieldErrors(error) {
  const data = error && error.response && error.response.data
  return (data && data.fieldErrors) || {}
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, body) => http.post(url, body).then((r) => r.data)
const put = (url, body) => http.put(url, body).then((r) => r.data)
const del = (url) => http.delete(url).then((r) => r.data)

// ---- auth and profile (UserController)
export const register = (body) => post('/api/users/register', body)
export const login = (body) => post('/api/users/login', body)
export const me = () => get('/api/users/me')
export const updateMe = (body) => put('/api/users/me', body)

// ---- dashboard and analytics (DashboardController)
export const dashboard = () => get('/api/dashboard')
export const analytics = () => get('/api/analytics')

// ---- interviews (InterviewController)
export const createInterview = (body) => post('/api/interviews', body)
export const getInterview = (id) => get(`/api/interviews/${id}`)
export const getActiveInterview = () => http.get('/api/interviews/active').then((r) => r.data || null) // 204 -> null
export const listInterviews = (params) => get('/api/interviews', params)
export const saveAnswer = (id, order, body) => put(`/api/interviews/${id}/answers/${order}`, body)
export const completeInterview = (id, body) => post(`/api/interviews/${id}/complete`, body)
export const deleteInterview = (id) => del(`/api/interviews/${id}`)

// ---- question bank, practice, bookmarks (QuestionController)
export const listQuestions = (params) => get('/api/questions', params)
export const questionMeta = () => get('/api/questions/meta')
export const getQuestion = (id) => get(`/api/questions/${id}`)
export const practiceEvaluate = (body) => post('/api/practice/evaluate', body)
export const listBookmarks = () => get('/api/bookmarks')
export const addBookmark = (questionId) => post(`/api/bookmarks/${questionId}`)
export const removeBookmark = (questionId) => del(`/api/bookmarks/${questionId}`)
