import { useState } from 'react'
import { FiAlertCircle, FiLogOut, FiSave } from 'react-icons/fi'
import * as api from '../api'
import { Alert, Button, Card, Field, PageHeader } from '../components/ui'
import { useAuth } from '../context/authContext'
import { useToast } from '../context/toastContext'
import { SPEECH_LANGUAGES } from '../utils/constants'
import { formatDate, initials } from '../utils/format'
import { INTERVIEWER_OPTIONS } from '../utils/interviewers'
import { PREF_INTERVIEWER, PREF_SPEECH_LANG, readPref, writePref } from '../utils/prefs'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    education: user.education || '',
    skills: user.skills || '',
    targetRole: user.targetRole || '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [interviewer, setInterviewer] = useState(() => readPref(PREF_INTERVIEWER, 'auto'))
  const [lang, setLang] = useState(() => readPref(PREF_SPEECH_LANG, 'en-IN'))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const res = await api.updateMe({ ...form, name: form.name.trim(), email: form.email.trim() })
      updateUser(res.user, res.token) // a new token is returned only when the email changed
      toast.success('Profile saved.')
    } catch (err) {
      setFormError(api.errorMessage(err))
      setErrors(api.fieldErrors(err))
    }
    setSaving(false)
  }

  const savePref = (key, setter) => (e) => {
    setter(e.target.value)
    writePref(key, e.target.value)
    toast.success('Preference saved on this device.')
  }

  return (
    <div>
      <PageHeader title="Profile and settings" subtitle={`Member since ${formatDate(user.createdAt)}`} />

      <div className="grid grid-main">
        <Card title="Your details">
          <div className="flex" style={{ marginBottom: 16 }}>
            <span className="avatar-initials" style={{ width: 56, height: 56, fontSize: '1.2rem' }} aria-hidden="true">{initials(user.name)}</span>
            <span className="muted small">Profile photo upload is not available yet. Your initials are shown instead.</span>
          </div>
          {formError && <div style={{ marginBottom: 14 }}><Alert tone="error" icon={FiAlertCircle}>{formError}</Alert></div>}
          <form onSubmit={save} noValidate>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Full name" htmlFor="pf-name" error={errors.name}>
                  <input id="pf-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={Boolean(errors.name)} />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Email" htmlFor="pf-email" error={errors.email}>
                  <input id="pf-email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={Boolean(errors.email)} />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Education" htmlFor="pf-edu" error={errors.education}>
                  <input id="pf-edu" className="input" placeholder="e.g. B.E. Computer Science, 2028" value={form.education} onChange={set('education')} />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Target role" htmlFor="pf-role" error={errors.targetRole}>
                  <input id="pf-role" className="input" placeholder="e.g. Java Developer" value={form.targetRole} onChange={set('targetRole')} />
                </Field>
              </div>
              <div className="col-12">
                <Field label="Skills" htmlFor="pf-skills" error={errors.skills} hint="Comma separated, for example: Java, SQL, React">
                  <textarea id="pf-skills" className="textarea" style={{ minHeight: 90 }} value={form.skills} onChange={set('skills')} />
                </Field>
              </div>
            </div>
            <Button type="submit" loading={saving} icon={!saving && <FiSave />}>Save changes</Button>
          </form>
        </Card>

        <div className="stack">
          <Card title="Interview preferences">
            <Field label="Interviewer" htmlFor="pref-int" hint="Saved on this device.">
              <select id="pref-int" className="select" value={interviewer} onChange={savePref(PREF_INTERVIEWER, setInterviewer)}>
                {INTERVIEWER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Speech language" htmlFor="pref-lang" hint="Used for speech-to-text. Pick the accent that matches yours.">
              <select id="pref-lang" className="select" value={lang} onChange={savePref(PREF_SPEECH_LANG, setLang)}>
                {SPEECH_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
          </Card>
          <Card title="Session">
            <Button variant="danger" block icon={<FiLogOut />} onClick={() => logout('You have been logged out.')}>Log out</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
