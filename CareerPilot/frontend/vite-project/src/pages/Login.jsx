import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiEye, FiEyeOff, FiInfo } from 'react-icons/fi'
import * as api from '../api'
import { Brand } from '../components/AppLayout'
import { Alert, Button, Card, Field } from '../components/ui'
import { NOTICE_KEY } from '../context/AuthProvider'
import { useAuth } from '../context/authContext'
import { useToast } from '../context/toastContext'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice] = useState(() => {
    const message = window.sessionStorage.getItem(NOTICE_KEY)
    window.sessionStorage.removeItem(NOTICE_KEY)
    return message
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.email.trim()) next.email = 'Enter your email address'
    if (!form.password) next.password = 'Enter your password'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return

    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const from = location.state && location.state.from
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (err) {
      const status = err.response && err.response.status
      setFormError(status === 401 ? 'Incorrect email or password.' : api.errorMessage(err))
      setErrors(api.fieldErrors(err))
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card stack">
        <div className="center"><Brand to="/" /></div>
        <Card>
          <h1>Log in</h1>
          <p className="muted">Continue your interview practice.</p>
          {notice && <div className="mt"><Alert tone="info" icon={FiInfo}>{notice}</Alert></div>}
          {formError && <div className="mt"><Alert tone="error" icon={FiAlertCircle}>{formError}</Alert></div>}
          <form onSubmit={submit} noValidate className="mt">
            <Field label="Email" htmlFor="email" error={errors.email}>
              <input id="email" className="input" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password}>
              <div className="input-wrap">
                <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </Field>
            <Button type="submit" block loading={loading}>{loading ? 'Logging in...' : 'Log in'}</Button>
          </form>
          <p className="center muted small mt">New to CareerPilot? <Link to="/register">Create an account</Link></p>
        </Card>
      </div>
    </div>
  )
}
