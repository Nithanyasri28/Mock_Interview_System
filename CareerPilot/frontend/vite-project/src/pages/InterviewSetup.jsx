import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiArrowRight, FiClock, FiRotateCcw } from 'react-icons/fi'
import * as api from '../api'
import { Alert, Button, Card, Field, PageHeader } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import { DIFFICULTIES, QUESTION_COUNTS, ROLES, TIME_OPTIONS, TYPES, labelOf } from '../utils/constants'
import { INTERVIEWER_OPTIONS } from '../utils/interviewers'
import { PREF_INTERVIEWER, readPref, writePref } from '../utils/prefs'

export default function InterviewSetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const active = useAsync(() => api.getActiveInterview(), [])
  const meta = useAsync(() => api.questionMeta(), [])

  const [form, setForm] = useState({
    role: 'Java Developer',
    difficulty: 'BEGINNER',
    interviewType: 'TECHNICAL',
    questionCount: 5,
    timePerQuestionSeconds: 60,
    focusTopics: [],
  })
  const [interviewer, setInterviewer] = useState(() => readPref(PREF_INTERVIEWER, 'auto'))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const topics = (meta.data && meta.data.topics) || []
  const technicalTopics = topics.filter((t) => !['HR', 'Behavioral'].includes(t))
  const showFocus = form.interviewType === 'TECHNICAL' || form.interviewType === 'MIXED'
  const minutes = Math.max(1, Math.round((form.questionCount * form.timePerQuestionSeconds) / 60))

  const toggleTopic = (topic) =>
    setForm((f) => ({
      ...f,
      focusTopics: f.focusTopics.includes(topic) ? f.focusTopics.filter((t) => t !== topic) : [...f.focusTopics, topic],
    }))

  const validate = () => {
    const next = {}
    if (!form.role) next.role = 'Choose a role'
    if (form.questionCount < 1 || form.questionCount > 30) next.questionCount = 'Choose between 1 and 30 questions'
    if (form.timePerQuestionSeconds < 15 || form.timePerQuestionSeconds > 600) next.timePerQuestionSeconds = 'Choose between 15 and 600 seconds'
    return next
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      writePref(PREF_INTERVIEWER, interviewer)
      const payload = { ...form, focusTopics: showFocus ? form.focusTopics : [] }
      const session = await api.createInterview(payload)
      navigate(`/interview/${session.interview.id}/check`, { state: { warning: session.warning } })
    } catch (err) {
      setFormError(api.errorMessage(err))
      setErrors(api.fieldErrors(err))
      setLoading(false)
    }
  }

  const discard = async () => {
    try {
      await api.deleteInterview(active.data.interview.id)
      toast.success('Unfinished interview discarded.')
      active.reload()
    } catch (err) {
      toast.error(api.errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader title="New interview" subtitle="Choose your settings. Questions come from the CareerPilot question bank." />

      {active.data && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="warn" icon={FiRotateCcw}>
            <div className="row-between">
              <span>You have an unfinished <strong>{active.data.interview.role}</strong> interview. Starting a new one will discard it.</span>
              <span className="flex">
                <Link className="btn btn-secondary btn-sm" to={`/interview/${active.data.interview.id}/room`}>Resume</Link>
                <Button variant="danger" size="sm" onClick={discard}>Discard</Button>
              </span>
            </div>
          </Alert>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <div className="grid grid-main">
          <Card>
            {formError && <div style={{ marginBottom: 14 }}><Alert tone="error" icon={FiAlertCircle}>{formError}</Alert></div>}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Job role" htmlFor="role" error={errors.role}>
                  <select id="role" className="select" value={form.role} onChange={(e) => set('role', e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Difficulty" htmlFor="difficulty">
                  <select id="difficulty" className="select" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                    {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-12">
                <Field label="Interview type" htmlFor="interviewType" hint={TYPES.find((t) => t.value === form.interviewType).hint}>
                  <div className="chips" role="radiogroup" aria-label="Interview type">
                    {TYPES.map((t) => (
                      <button key={t.value} type="button" role="radio" aria-checked={form.interviewType === t.value} className={`chip ${form.interviewType === t.value ? 'active' : ''}`} onClick={() => set('interviewType', t.value)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Number of questions" htmlFor="questionCount" error={errors.questionCount}>
                  <select id="questionCount" className="select" value={form.questionCount} onChange={(e) => set('questionCount', Number(e.target.value))}>
                    {QUESTION_COUNTS.map((n) => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Time per question" htmlFor="timePerQuestionSeconds" error={errors.timePerQuestionSeconds}>
                  <select id="timePerQuestionSeconds" className="select" value={form.timePerQuestionSeconds} onChange={(e) => set('timePerQuestionSeconds', Number(e.target.value))}>
                    {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-12">
                <Field label="Interviewer" htmlFor="interviewer" hint="Only changes who asks the questions on screen and which voice is used.">
                  <select id="interviewer" className="select" value={interviewer} onChange={(e) => setInterviewer(e.target.value)}>
                    {INTERVIEWER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
              {showFocus && (
                <div className="col-12">
                  <Field label="Skill focus (optional)" hint="Pick topics to prioritise. If a topic has too few questions for your role, other questions fill the gap.">
                    {meta.error ? <span className="muted small">Topics could not be loaded. You can still start without a focus.</span> : (
                      <div className="chips">
                        {technicalTopics.map((t) => (
                          <button key={t} type="button" aria-pressed={form.focusTopics.includes(t)} className={`chip ${form.focusTopics.includes(t) ? 'active' : ''}`} onClick={() => toggleTopic(t)}>{t}</button>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>
              )}
            </div>
          </Card>

          <Card title="Summary">
            <ul className="clean muted">
              <li><strong style={{ color: 'var(--text)' }}>{form.role}</strong></li>
              <li>{labelOf(DIFFICULTIES, form.difficulty)} - {labelOf(TYPES, form.interviewType)}</li>
              <li>{form.questionCount} questions, {labelOf(TIME_OPTIONS, form.timePerQuestionSeconds)} each</li>
              {showFocus && form.focusTopics.length > 0 && <li>Focus: {form.focusTopics.join(', ')}</li>}
            </ul>
            <p className="small muted"><FiClock aria-hidden="true" /> About {minutes} minute{minutes === 1 ? '' : 's'} at most.</p>
            <Button type="submit" block loading={loading} icon={!loading && <FiArrowRight />}>{loading ? 'Preparing...' : 'Continue to device check'}</Button>
            <p className="small muted mt" style={{ marginBottom: 0 }}>Your answers are scored with keyword rules, not AI. You will see exactly how on the results page.</p>
          </Card>
        </div>
      </form>
    </div>
  )
}
