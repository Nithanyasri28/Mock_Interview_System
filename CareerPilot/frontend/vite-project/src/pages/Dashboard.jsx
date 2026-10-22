import { Link, useNavigate } from 'react-router-dom'
import { FiAward, FiBarChart2, FiCheckCircle, FiClock, FiPlayCircle, FiRotateCcw, FiTarget, FiUser } from 'react-icons/fi'
import * as api from '../api'
import { LineChart } from '../components/charts'
import { Alert, Badge, Button, Card, EmptyState, ErrorState, PageHeader, ScorePill, Skeleton, SkeletonCards } from '../components/ui'
import { useAuth } from '../context/authContext'
import useAsync from '../hooks/useAsync'
import { labelOf, DIFFICULTIES, TYPES } from '../utils/constants'
import { firstName, formatDate, scoreTone } from '../utils/format'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), [])

  if (error) return <ErrorState message={api.errorMessage(error)} onRetry={reload} />

  const has = data && data.totalInterviews > 0

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName(user && user.name)}`}
        subtitle="Your interview preparation workspace."
        actions={<Button icon={<FiPlayCircle />} onClick={() => navigate('/interview/new')}>Start New Interview</Button>}
      />

      {data && data.activeInterviewId && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="warn" icon={FiRotateCcw}>
            <div className="row-between">
              <span>You have an unfinished interview.</span>
              <Link className="btn btn-secondary btn-sm" to={`/interview/${data.activeInterviewId}/room`}>Resume interview</Link>
            </div>
          </Alert>
        </div>
      )}

      {loading && !data ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-3">
          <Card><div className="stat"><span className="label"><FiCheckCircle aria-hidden="true" /> Interviews completed</span><span className="value">{data.totalInterviews}</span></div></Card>
          <Card><div className="stat"><span className="label"><FiBarChart2 aria-hidden="true" /> Average score</span><span className="value">{data.averageScore === null ? '-' : <>{data.averageScore}<small>%</small></>}</span></div></Card>
          <Card><div className="stat"><span className="label"><FiAward aria-hidden="true" /> Best score</span><span className="value">{data.bestScore === null ? '-' : <>{data.bestScore}<small>%</small></>}</span></div></Card>
        </div>
      )}

      {data && (
        <div className="grid grid-main mt">
          <Card title="Score trend" action={has && <Link to="/performance" className="small">Full analytics</Link>}>
            {has ? <LineChart points={data.scoreTrend.map((p) => ({ id: p.interviewId, date: p.date, score: p.score, role: p.role }))} /> : (
              <EmptyState icon={FiBarChart2} title="No scores yet" text="Complete your first interview and your score trend will appear here." action={<Link className="btn btn-primary btn-sm" to="/interview/new">Start your first interview</Link>} />
            )}
          </Card>

          <div className="stack">
            <Card title="Quick actions">
              <div className="stack">
                <Link className="btn btn-primary btn-block" to="/interview/new"><FiPlayCircle /> New interview</Link>
                <Link className="btn btn-secondary btn-block" to="/history"><FiClock /> View history</Link>
                <Link className="btn btn-secondary btn-block" to="/practice"><FiTarget /> Practice a question</Link>
                <Link className="btn btn-secondary btn-block" to="/profile"><FiUser /> Update profile</Link>
              </div>
            </Card>
            <Card title="Recommended practice">
              {data.recommendedTopics.length > 0 ? (
                <>
                  <p className="muted small">Topics where your average answer score is below 70%.</p>
                  <div className="chips">
                    {data.recommendedTopics.map((t) => (
                      <Link key={t} className="chip" to={`/questions?topic=${encodeURIComponent(t)}`}>{t}</Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  {has ? 'No weak topics found. Keep practising to stay sharp.' : 'Recommendations appear after you complete an interview.'}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {data && (
        <Card title="Recent interviews" className="mt" action={has && <Link to="/history" className="small">View all</Link>}>
          {loading && !data ? <Skeleton height={60} /> : has ? (
            data.recentInterviews.map((iv) => (
              <div key={iv.id} className="list-row">
                <div>
                  <strong>{iv.role}</strong>
                  <div className="flex small muted">
                    <span>{formatDate(iv.completedAt || iv.startedAt)}</span>
                    <Badge tone="accent">{labelOf(TYPES, iv.interviewType)}</Badge>
                    <Badge>{labelOf(DIFFICULTIES, iv.difficulty)}</Badge>
                  </div>
                </div>
                <div className="flex">
                  <ScorePill score={iv.overallScore} tone={scoreTone(iv.overallScore)} />
                  <Link className="btn btn-secondary btn-sm" to={`/results/${iv.id}`}>View results</Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No interviews yet" text="Your completed interviews will be listed here." />
          )}
        </Card>
      )}
    </div>
  )
}
