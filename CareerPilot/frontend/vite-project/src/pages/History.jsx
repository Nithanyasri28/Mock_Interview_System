import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiClock, FiSearch, FiTrash2 } from 'react-icons/fi'
import * as api from '../api'
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, ScorePill, Skeleton } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import { DIFFICULTIES, ROLES, TYPES, labelOf } from '../utils/constants'
import { formatDate, scoreTone } from '../utils/format'

export default function History() {
  const toast = useToast()
  const [filters, setFilters] = useState({ search: '', role: '', type: '', difficulty: '', sort: 'date', order: 'desc' })
  const [debounced, setDebounced] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters.search.trim()), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  const params = { search: debounced || undefined, role: filters.role || undefined, type: filters.type || undefined, difficulty: filters.difficulty || undefined, sort: filters.sort, order: filters.order }
  const { data, error, loading, reload } = useAsync(() => api.listInterviews(params), [debounced, filters.role, filters.type, filters.difficulty, filters.sort, filters.order])

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const filtering = Boolean(debounced || filters.role || filters.type || filters.difficulty)

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteInterview(toDelete.id)
      toast.success('Interview deleted.')
      setToDelete(null)
      reload()
    } catch (err) {
      toast.error(api.errorMessage(err))
    }
    setDeleting(false)
  }

  return (
    <div>
      <PageHeader title="Interview history" subtitle="Every completed interview, saved to your account." />

      <Card className="card-flat">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="label-text" htmlFor="search">Search</label>
            <div className="input-wrap">
              <input id="search" className="input" placeholder="Role, type or difficulty" value={filters.search} onChange={set('search')} />
              <button type="button" tabIndex={-1} aria-hidden="true" style={{ pointerEvents: 'none' }}><FiSearch /></button>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <label className="label-text" htmlFor="f-role">Role</label>
            <select id="f-role" className="select" value={filters.role} onChange={set('role')}>
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="label-text" htmlFor="f-type">Type</label>
            <select id="f-type" className="select" value={filters.type} onChange={set('type')}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="label-text" htmlFor="f-diff">Difficulty</label>
            <select id="f-diff" className="select" value={filters.difficulty} onChange={set('difficulty')}>
              <option value="">All levels</option>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="label-text" htmlFor="f-sort">Sort by</label>
            <select id="f-sort" className="select" value={`${filters.sort}-${filters.order}`} onChange={(e) => { const [sort, order] = e.target.value.split('-'); setFilters((f) => ({ ...f, sort, order })) }}>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="score-desc">Highest score</option>
              <option value="score-asc">Lowest score</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="mt">
        {error ? <ErrorState message={api.errorMessage(error)} onRetry={reload} /> : loading && !data ? (
          <div className="stack"><Skeleton height={52} /><Skeleton height={52} /><Skeleton height={52} /></div>
        ) : data.length === 0 ? (
          filtering ? <EmptyState icon={FiSearch} title="No interviews match your filters" text="Try clearing a filter or searching for something else." />
            : <EmptyState icon={FiClock} title="No completed interviews yet" text="After you finish an interview it will be listed here with its score." action={<Link className="btn btn-primary" to="/interview/new">Start an interview</Link>} />
        ) : (
          <div aria-busy={loading}>
            {data.map((iv) => (
              <div key={iv.id} className="history-row">
                <div>
                  <strong>{iv.role}</strong>
                  <div className="small muted">{formatDate(iv.completedAt || iv.startedAt)}</div>
                </div>
                <div className="flex hide-sm">
                  <Badge tone="accent">{labelOf(TYPES, iv.interviewType)}</Badge>
                  <Badge>{labelOf(DIFFICULTIES, iv.difficulty)}</Badge>
                  <span className="small muted">{iv.answeredCount}/{iv.questionCount} answered</span>
                </div>
                <ScorePill score={iv.overallScore} tone={scoreTone(iv.overallScore)} />
                <div className="flex">
                  <Link className="btn btn-secondary btn-sm" to={`/results/${iv.id}`}>View results</Link>
                  <Button variant="ghost" size="sm" className="btn-icon" onClick={() => setToDelete(iv)} aria-label={`Delete ${iv.role} interview`}><FiTrash2 /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={Boolean(toDelete)} title="Delete this interview?" onClose={() => setToDelete(null)} actions={<><Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete</Button></>}>
        <p className="muted">{toDelete && `${toDelete.role} - ${formatDate(toDelete.completedAt || toDelete.startedAt)}`}. Its answers and results will be removed permanently and your statistics will change.</p>
      </Modal>
    </div>
  )
}
