import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi'
import * as api from '../api'
import { Brand } from '../components/AppLayout'
import { Alert, Button, Card, Field } from '../components/ui'
import { useAuth } from '../context/authContext'
import { useToast } from '../context/toastContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address'
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Password needs at least one letter and one number'
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match'
  return errors
}

export default function Register() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      await api.register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
    } catch (err) {
      setFormError(api.errorMessage(err))
      setErrors(api.fieldErrors(err))
      setLoading(false)
      return
    }
    try {
      await login(form.email.trim(), form.password)
      toast.success('Account created. Welcome to CareerPilot!')
      navigate('/dashboard', { replace: true })
    } catch {
      toast.success('Account created. Please log in.')
      navigate('/login', { replace: true })
    }
  }

  const field = (id, label, type, autoComplete, extra = {}) => (
    <Field label={label} htmlFor={id} error={errors[id]} hint={extra.hint}>
      <input id={id} className="input" type={type} autoComplete={autoComplete} value={form[id]} onChange={set(id)} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined} />
    </Field>
  )

  return (
    <div className="auth-page">
      <div className="auth-card stack">
        <div className="center"><Brand to="/" /></div>
        <Card>
          <h1>Create your account</h1>
          <p className="muted">Free to use. Your interview history stays private to you.</p>
          {formError && <div className="mt"><Alert tone="error" icon={FiAlertCircle}>{formError}</Alert></div>}
          <form onSubmit={submit} noValidate className="mt">
            {field('name', 'Full name', 'text', 'name')}
            {field('email', 'Email', 'email', 'email')}
            <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters with a letter and a number">
              <div className="input-wrap">
                <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </Field>
            {field('confirm', 'Confirm password', show ? 'text' : 'password', 'new-password')}
            <Button type="submit" block loading={loading}>{loading ? 'Creating account...' : 'Register'}</Button>
          </form>
          <p className="center muted small mt">Already registered? <Link to="/login">Log in</Link></p>
        </Card>
      </div>
    </div>
  )
}
