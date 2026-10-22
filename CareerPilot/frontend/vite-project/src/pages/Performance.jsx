import { Link } from 'react-router-dom'
import { FiArrowDownRight, FiArrowUpRight, FiBarChart2, FiMinus } from 'react-icons/fi'
import * as api from '../api'
import { BarList, LineChart } from '../components/charts'
import { Alert, Card, EmptyState, ErrorState, PageHeader, SkeletonCards } from '../components/ui'
import useAsync from '../hooks/useAsync'
import { TYPES, labelOf } from '../utils/constants'

export default function Performance() {
  const { data, error, loading, reload } = useAsync(() => api.analytics(), [])

  if (error) return <ErrorState message={api.errorMessage(error)} onRetry={reload} />
  if (loading && !data) return <><PageHeader title="Performance" /><SkeletonCards count={2} height={220} /></>

  if (data.totalInterviews === 0) {
    return (
      <div>
        <PageHeader title="Performance" subtitle="Trends from your completed interviews." />
        <Card><EmptyState icon={FiBarChart2} title="No data yet" text={data.note} action={<Link className="btn btn-primary" to="/interview/new">Start an interview</Link>} /></Card>
      </div>
    )
  }

  const cmp = data.comparison
  const Trend = cmp && cmp.change > 0 ? FiArrowUpRight : cmp && cmp.change < 0 ? FiArrowDownRight : FiMinus

  return (
    <div>
      <PageHeader title="Performance" subtitle="Calculated only from interviews you completed." />
      <div style={{ marginBottom: 16 }}><Alert tone="info">{data.note}</Alert></div>

      <div className="grid grid-main">
        <Card title="Score over time"><LineChart points={data.scoreTrend.map((p) => ({ id: p.interviewId, date: p.date, score: p.score, role: p.role }))} /></Card>
        <Card title="Latest vs previous">
          {cmp ? (
            <div className="stat">
              <span className="label"><Trend aria-hidden="true" /> Change since your previous interview</span>
              <span className="value">{cmp.change > 0 ? '+' : ''}{cmp.change}<small> points</small></span>
              <span className="muted small">{cmp.previousScore}% then, {cmp.latestScore}% now</span>
              <Link className="small mt" to={`/results/${cmp.latestInterviewId}`}>View latest results</Link>
            </div>
          ) : <p className="muted small" style={{ margin: 0 }}>Complete a second interview to compare it with your first.</p>}
        </Card>
      </div>

      <div className="grid grid-2 mt">
        <Card title="Average by interview type">
          <BarList items={data.byInterviewType.map((c) => ({ label: `${labelOf(TYPES, c.label)} (${c.interviews})`, value: c.averageScore }))} />
        </Card>
        <Card title="Average by role">
          <BarList items={data.byRole.map((c) => ({ label: `${c.label} (${c.interviews})`, value: c.averageScore }))} />
        </Card>
      </div>

      <Card title="Topic performance" className="mt">
        {data.topics.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No answered questions yet.</p> : (
          <>
            <BarList items={data.topics.map((t) => ({ label: `${t.topic} (${t.questionsAnswered})${t.sufficientData ? '' : '*'}`, value: t.averageScore }))} />
            <p className="small muted" style={{ marginBottom: 0 }}>* Fewer than 3 answered questions, so treat this number with caution.</p>
          </>
        )}
      </Card>

      <div className="grid grid-2 mt">
        <Card title="Strengths">
          {data.strengths.length > 0 ? <ul className="clean">{data.strengths.map((t) => <li key={t.topic}>{t.topic} <span className="muted">({t.averageScore}%)</span></li>)}</ul> : <p className="muted small" style={{ margin: 0 }}>A topic becomes a strength after at least 2 answers averaging 70% or more.</p>}
        </Card>
        <Card title="Weak areas">
          {data.weakAreas.length > 0 ? <ul className="clean">{data.weakAreas.map((t) => <li key={t.topic}><Link to={`/questions?topic=${encodeURIComponent(t.topic)}`}>{t.topic}</Link> <span className="muted">({t.averageScore}%)</span></li>)}</ul> : <p className="muted small" style={{ margin: 0 }}>No topic is below 60% right now.</p>}
        </Card>
      </div>

      {data.recommendations.length > 0 && (
        <Card title="Practice recommendations" className="mt"><ul className="clean">{data.recommendations.map((r) => <li key={r}>{r}</li>)}</ul></Card>
      )}
    </div>
  )
}
