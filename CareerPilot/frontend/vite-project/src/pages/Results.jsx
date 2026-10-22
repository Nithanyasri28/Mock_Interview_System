import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiAlertTriangle, FiArrowLeft, FiBookmark, FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo, FiPrinter, FiRepeat, FiTarget } from 'react-icons/fi'
import * as api from '../api'
import EvaluationView from '../components/EvaluationView'
import { ScoreRing } from '../components/charts'
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, ScorePill, SkeletonCards } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import { DIFFICULTIES, TYPES, labelOf } from '../utils/constants'
import { formatDateTime, scoreTone } from '../utils/format'

function AnswerCard({ a, bookmarked, onToggleBookmark, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const tone = scoreTone(a.answered ? a.score : null)
  return (
    <div className="q-card">
      <button type="button" className="q-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div style={{ minWidth: 0 }}>
          <div className="small muted">Question {a.order}{a.topic ? ` - ${a.topic}` : ''}</div>
          <strong>{a.questionText}</strong>
        </div>
        <span className="flex" style={{ flexShrink: 0 }}>
          {a.answered ? <ScorePill score={a.score} tone={tone} /> : <Badge>Skipped</Badge>}
          {open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
        </span>
      </button>
      {open && (
        <div className="q-body stack">
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}>Your answer {a.answered && a.inputMethod ? `(${a.inputMethod === 'SPEECH' ? 'spoken, transcribed by your browser' : 'typed'})` : ''}</div>
            {a.answered ? <div className="answer-quote">{a.answerText}</div> : <p className="muted" style={{ margin: 0 }}>No answer was submitted, so this question scored 0.</p>}
          </div>
          <EvaluationView evaluation={a} answered={a.answered} />
          {a.questionId && (
            <div className="no-print">
              <Button variant="secondary" size="sm" icon={<FiBookmark />} onClick={() => onToggleBookmark(a.questionId)}>
                {bookmarked ? 'Remove bookmark' : 'Bookmark for revision'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const detail = useAsync(() => api.getInterview(id), [id])
  const marks = useAsync(() => api.listBookmarks(), [])
  const [added, setAdded] = useState({}) // questionId -> true/false overrides after the user clicks
  const [retaking, setRetaking] = useState(false)

  if (detail.error) {
    const notFound = detail.error.response && detail.error.response.status === 404
    return <ErrorState message={notFound ? 'This interview was not found in your account.' : api.errorMessage(detail.error)} onRetry={notFound ? undefined : detail.reload} />
  }
  if (detail.loading && !detail.data) return <SkeletonCards count={3} height={140} />

  const { interview, result } = detail.data
  if (!result) {
    return (
      <Card>
        <EmptyState icon={FiInfo} title="This interview is not finished" text="Results appear after you finish the interview." action={<Link className="btn btn-primary" to={`/interview/${id}/room`}>Resume interview</Link>} />
      </Card>
    )
  }

  const savedIds = new Set(((marks.data) || []).map((q) => q.id))
  const isMarked = (qid) => (qid in added ? added[qid] : savedIds.has(qid))

  const toggleBookmark = async (qid) => {
    const was = isMarked(qid)
    setAdded((m) => ({ ...m, [qid]: !was }))
    try {
      if (was) await api.removeBookmark(qid)
      else await api.addBookmark(qid)
      toast.success(was ? 'Bookmark removed.' : 'Question bookmarked.')
    } catch (err) {
      setAdded((m) => ({ ...m, [qid]: was }))
      toast.error(api.errorMessage(err))
    }
  }

  const retake = async () => {
    setRetaking(true)
    try {
      const session = await api.createInterview({
        role: interview.role,
        difficulty: interview.difficulty,
        interviewType: interview.interviewType,
        questionCount: interview.questionCount,
        timePerQuestionSeconds: interview.timePerQuestionSeconds,
        focusTopics: interview.focusTopics,
      })
      navigate(`/interview/${session.interview.id}/check`, { state: { warning: session.warning } })
    } catch (err) {
      toast.error(api.errorMessage(err))
      setRetaking(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Interview results"
        subtitle={`${interview.role} - ${labelOf(TYPES, interview.interviewType)} - ${labelOf(DIFFICULTIES, interview.difficulty)} - ${formatDateTime(interview.completedAt)}`}
        actions={<>
          <Link className="btn btn-ghost no-print" to="/history"><FiArrowLeft /> History</Link>
          <Button variant="secondary" className="no-print" icon={<FiPrinter />} onClick={() => window.print()}>Export PDF</Button>
          <Button className="no-print" icon={<FiRepeat />} loading={retaking} onClick={retake}>Retake</Button>
        </>}
      />

      <div style={{ marginBottom: 16 }}>
        <Alert tone="info" icon={FiInfo}>
          <strong>Rule-based keyword scoring, not AI.</strong> {result.evaluationNote}
        </Alert>
      </div>

      <div className="grid grid-main">
        <Card>
          <div className="flex" style={{ gap: 24, flexWrap: 'wrap' }}>
            <ScoreRing score={result.overallScore} label="overall" />
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2>Completion summary</h2>
              <p className="muted">{result.summary}</p>
              <div className="flex">
                <Badge tone="accent">{result.answeredCount} of {result.totalQuestions} answered</Badge>
                {interview.endedEarly && <Badge tone="low">Ended early</Badge>}
              </div>
            </div>
          </div>
        </Card>
        <Card title="Study next">
          {result.recommendedTopics.length > 0 ? (
            <div className="chips">
              {result.recommendedTopics.map((t) => <Link key={t} className="chip" to={`/questions?topic=${encodeURIComponent(t)}`}>{t}</Link>)}
            </div>
          ) : <p className="muted small" style={{ margin: 0 }}>No weak topics found in this interview.</p>}
          <Link className="btn btn-secondary btn-sm mt" to="/practice"><FiTarget /> Practice questions</Link>
        </Card>
      </div>

      <div className="grid grid-2 mt">
        <Card title="Strengths">
          {result.strengths.length > 0 ? <ul className="clean">{result.strengths.map((s) => <li key={s}><FiCheckCircle style={{ color: 'var(--good)' }} aria-hidden="true" /> {s}</li>)}</ul> : <p className="muted small" style={{ margin: 0 }}>No topic reached an average of 70% in this interview yet. Keep practising.</p>}
        </Card>
        <Card title="Areas to improve">
          {result.improvements.length > 0 ? <ul className="clean">{result.improvements.map((s) => <li key={s}><FiAlertTriangle style={{ color: 'var(--ok)' }} aria-hidden="true" /> {s}</li>)}</ul> : <p className="muted small" style={{ margin: 0 }}>Nothing flagged. Well done.</p>}
        </Card>
      </div>

      {result.missingConcepts.length > 0 && (
        <Card title="Missing key concepts" className="mt">
          <div className="chips">
            {result.missingConcepts.map((m, i) => <span key={`${m.concept}-${i}`} className="chip chip-static chip-low" title={m.topic}>{m.concept}{m.topic ? ` (${m.topic})` : ''}</span>)}
          </div>
        </Card>
      )}

      <h2 className="mt">Question by question</h2>
      {result.answers.map((a) => (
        <AnswerCard key={a.order} a={a} defaultOpen={result.answers.length <= 3} bookmarked={a.questionId ? isMarked(a.questionId) : false} onToggleBookmark={toggleBookmark} />
      ))}
    </div>
  )
}
