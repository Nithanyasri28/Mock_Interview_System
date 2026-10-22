import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiAlertTriangle, FiInfo, FiMic, FiRefreshCw, FiSend, FiSquare, FiTarget } from 'react-icons/fi'
import * as api from '../api'
import EvaluationView from '../components/EvaluationView'
import { ScoreRing } from '../components/charts'
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import { CATEGORIES, DIFFICULTIES, ROLES, labelOf } from '../utils/constants'
import { joinText } from '../utils/format'
import { PREF_SPEECH_LANG, readPref } from '../utils/prefs'

export default function Practice() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ role: '', category: '', difficulty: '', topic: '' })
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000))
  const [pickedId, setPickedId] = useState(() => Number(params.get('question')) || null)
  const [answer, setAnswer] = useState('')
  const [method, setMethod] = useState('TYPED')
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const meta = useAsync(() => api.questionMeta(), [])
  const list = useAsync(
    () => api.listQuestions({ role: filters.role || undefined, category: filters.category || undefined, difficulty: filters.difficulty || undefined, topic: filters.topic || undefined }),
    [filters.role, filters.category, filters.difficulty, filters.topic],
  )

  const onFinal = useCallback((chunk) => {
    setAnswer((a) => joinText(a, chunk))
    setMethod('SPEECH')
  }, [])
  const recognition = useSpeechRecognition({ lang: readPref(PREF_SPEECH_LANG, 'en-IN'), onFinal })

  const questions = list.data || []
  const question = questions.find((q) => q.id === pickedId) || (questions.length > 0 ? questions[seed % questions.length] : null)

  const reset = () => {
    recognition.stop()
    setAnswer('')
    setMethod('TYPED')
    setResult(null)
    setFormError('')
  }

  const newQuestion = () => {
    reset()
    setPickedId(null)
    setSeed((s) => s + 1 + Math.floor(Math.random() * 1000))
  }

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setPickedId(null)
    reset()
  }

  const evaluate = async () => {
    if (!answer.trim()) {
      setFormError('Type or record an answer first.')
      return
    }
    recognition.stop()
    setSubmitting(true)
    setFormError('')
    try {
      setResult(await api.practiceEvaluate({ questionId: question.id, answer: answer.trim(), inputMethod: method }))
    } catch (err) {
      setFormError(api.errorMessage(err))
      toast.error('Could not evaluate your answer.')
    }
    setSubmitting(false)
  }

  const topics = (meta.data && meta.data.topics) || []

  return (
    <div>
      <PageHeader title="Practice mode" subtitle="Answer one question at a time. Practice answers are scored but not saved to your history." />

      <Card className="card-flat">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <label className="label-text" htmlFor="p-role">Role</label>
            <select id="p-role" className="select" value={filters.role} onChange={setFilter('role')}>
              <option value="">Any role</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="label-text" htmlFor="p-topic">Topic</label>
            <select id="p-topic" className="select" value={filters.topic} onChange={setFilter('topic')}>
              <option value="">Any topic</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="label-text" htmlFor="p-cat">Category</label>
            <select id="p-cat" className="select" value={filters.category} onChange={setFilter('category')}>
              <option value="">Any</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="label-text" htmlFor="p-diff">Difficulty</label>
            <select id="p-diff" className="select" value={filters.difficulty} onChange={setFilter('difficulty')}>
              <option value="">Any level</option>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mt">
        {list.error ? <ErrorState message={api.errorMessage(list.error)} onRetry={list.reload} /> : list.loading && !list.data ? <Skeleton height={160} /> : !question ? (
          <Card><EmptyState icon={FiTarget} title="No questions match" text="Try different filters." /></Card>
        ) : (
          <div className="stack">
            <Card>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <div className="flex">
                  {question.topic && <Badge tone="violet">{question.topic}</Badge>}
                  <Badge>{labelOf(DIFFICULTIES, question.difficulty)}</Badge>
                  <Badge>{labelOf(CATEGORIES, question.category)}</Badge>
                </div>
                <Button variant="secondary" size="sm" icon={<FiRefreshCw />} onClick={newQuestion}>New random question</Button>
              </div>
              <p className="question-text" style={{ margin: 0 }}>{question.questionText}</p>
            </Card>

            {!result ? (
              <Card title="Your answer">
                {!recognition.supported && <div style={{ marginBottom: 12 }}><Alert tone="info" icon={FiInfo}>Voice input is not supported in this browser. Please type your answer.</Alert></div>}
                {recognition.error && <div style={{ marginBottom: 12 }}><Alert tone="warn" icon={FiAlertTriangle}>{recognition.error}</Alert></div>}
                {formError && <div style={{ marginBottom: 12 }}><Alert tone="error" icon={FiAlertTriangle}>{formError}</Alert></div>}
                <label htmlFor="p-answer" className="sr-only">Your answer</label>
                <textarea id="p-answer" className="textarea" rows={6} placeholder="Type your answer, or press Start Recording..." value={answer} onChange={(e) => { setAnswer(e.target.value); setFormError('') }} />
                {recognition.interim && <p className="small muted" style={{ margin: '6px 0 0', fontStyle: 'italic' }}>Hearing: {recognition.interim}</p>}
                <div className="status-line">
                  {recognition.listening && !recognition.processing && <><span className="rec-dot" aria-hidden="true" /> Recording. Press Stop Recording when you are done.</>}
                  {recognition.processing && <><span className="spinner" aria-hidden="true" /> Processing the last words...</>}
                </div>
                <div className="action-bar">
                  {recognition.supported && (recognition.listening && !recognition.processing
                    ? <Button variant="secondary" icon={<FiSquare />} onClick={recognition.stop}>Stop Recording</Button>
                    : <Button variant="secondary" icon={<FiMic />} onClick={recognition.start} disabled={recognition.processing}>Start Recording</Button>)}
                  <Button icon={<FiSend />} loading={submitting} onClick={evaluate}>Get feedback</Button>
                </div>
              </Card>
            ) : (
              <Card title="Feedback" action={<Badge tone="accent">Rule-based, not AI</Badge>}>
                <div className="flex" style={{ gap: 24, marginBottom: 16 }}>
                  <ScoreRing score={result.score} label="score" size={110} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="small muted" style={{ marginBottom: 6 }}>Your answer</div>
                    <div className="answer-quote">{answer}</div>
                  </div>
                </div>
                <EvaluationView evaluation={result} />
                <p className="small muted mt">{result.evaluationNote}</p>
                <div className="action-bar">
                  <Button variant="secondary" onClick={() => setResult(null)}>Edit and try again</Button>
                  <Button onClick={newQuestion} icon={<FiRefreshCw />}>Next question</Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
