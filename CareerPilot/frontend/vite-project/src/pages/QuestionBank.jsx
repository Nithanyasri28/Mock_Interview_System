import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiBookmark, FiBookOpen, FiChevronDown, FiChevronUp, FiSearch, FiTarget } from 'react-icons/fi'
import * as api from '../api'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import { CATEGORIES, DIFFICULTIES, ROLES, labelOf } from '../utils/constants'

const PAGE_SIZE = 25

function QuestionItem({ q, marked, onToggle, detail }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(detail || null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleOpen = async () => {
    const next = !open
    setOpen(next)
    if (next && !loaded) {
      setLoading(true)
      setLoadError('')
      try {
        setLoaded(await api.getQuestion(q.id))
      } catch (err) {
        setLoadError(api.errorMessage(err))
      }
      setLoading(false)
    }
  }

  return (
    <div className="q-card">
      <div className="q-head" style={{ cursor: 'default' }}>
        <button type="button" onClick={toggleOpen} aria-expanded={open} style={{ flex: 1, background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
          <div className="flex small" style={{ marginBottom: 6 }}>
            {q.topic && <Badge tone="violet">{q.topic}</Badge>}
            <Badge>{labelOf(DIFFICULTIES, q.difficulty)}</Badge>
            <Badge>{labelOf(CATEGORIES, q.category)}</Badge>
          </div>
          <strong>{q.questionText}</strong>
        </button>
        <span className="flex" style={{ flexShrink: 0 }}>
          <Button variant="ghost" size="sm" className="btn-icon" onClick={() => onToggle(q)} aria-pressed={marked} aria-label={marked ? 'Remove bookmark' : 'Bookmark question'} title={marked ? 'Remove bookmark' : 'Bookmark'}>
            <FiBookmark style={marked ? { fill: 'var(--accent)', color: 'var(--accent)' } : undefined} />
          </Button>
          <Button variant="ghost" size="sm" className="btn-icon" onClick={toggleOpen} aria-label={open ? 'Hide answer' : 'Show answer'}>{open ? <FiChevronUp /> : <FiChevronDown />}</Button>
        </span>
      </div>
      {open && (
        <div className="q-body stack">
          {loading && <Skeleton height={60} />}
          {loadError && <ErrorState message={loadError} />}
          {loaded && (
            <>
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Key concepts a good answer covers</div>
                <div className="chips">{loaded.keyConcepts.map((k) => <span key={k} className="chip chip-static">{k}</span>)}</div>
              </div>
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Reference answer</div>
                <div className="answer-quote" style={{ borderLeftColor: 'var(--accent-2)' }}>{loaded.referenceAnswer}</div>
              </div>
            </>
          )}
          <div><Link className="btn btn-secondary btn-sm" to={`/practice?question=${q.id}`}><FiTarget /> Practice this question</Link></div>
        </div>
      )}
    </div>
  )
}

export default function QuestionBank() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [tab, setTab] = useState('all')
  const [filters, setFilters] = useState({ role: '', topic: params.get('topic') || '', category: '', difficulty: '', search: '' })
  const [debounced, setDebounced] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [overrides, setOverrides] = useState({}) // questionId -> bookmarked after the user clicks

  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters.search.trim()), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  const meta = useAsync(() => api.questionMeta(), [])
  const list = useAsync(
    () => api.listQuestions({ role: filters.role || undefined, topic: filters.topic || undefined, category: filters.category || undefined, difficulty: filters.difficulty || undefined, search: debounced || undefined }),
    [filters.role, filters.topic, filters.category, filters.difficulty, debounced],
  )
  const marks = useAsync(() => api.listBookmarks(), [])

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setVisible(PAGE_SIZE)
  }

  const bookmarkedIds = new Set((marks.data || []).map((q) => q.id))
  const isMarked = (q) => {
    if (q.id in overrides) return overrides[q.id]
    return marks.data ? bookmarkedIds.has(q.id) : Boolean(q.bookmarked)
  }

  const toggle = async (q) => {
    const was = isMarked(q)
    setOverrides((o) => ({ ...o, [q.id]: !was }))
    try {
      if (was) await api.removeBookmark(q.id)
      else await api.addBookmark(q.id)
      marks.reload()
    } catch (err) {
      setOverrides((o) => ({ ...o, [q.id]: was }))
      toast.error(api.errorMessage(err))
    }
  }

  const topics = (meta.data && meta.data.topics) || []
  const shown = list.data ? list.data.slice(0, visible) : []
  const bookmarkList = (marks.data || []).filter((q) => overrides[q.id] !== false)

  return (
    <div>
      <PageHeader title="Question bank" subtitle="Browse questions, read reference answers and bookmark the hard ones." />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'all'} className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All questions</button>
        <button type="button" role="tab" aria-selected={tab === 'bookmarks'} className={`tab ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => setTab('bookmarks')}>Bookmarks{marks.data ? ` (${bookmarkList.length})` : ''}</button>
      </div>

      {tab === 'all' && (
        <>
          <Card className="card-flat">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="label-text" htmlFor="q-search">Search</label>
                <div className="input-wrap">
                  <input id="q-search" className="input" placeholder="Search questions" value={filters.search} onChange={set('search')} />
                  <button type="button" tabIndex={-1} aria-hidden="true" style={{ pointerEvents: 'none' }}><FiSearch /></button>
                </div>
              </div>
              <div className="col-6 col-md-2">
                <label className="label-text" htmlFor="q-role">Role</label>
                <select id="q-role" className="select" value={filters.role} onChange={set('role')}>
                  <option value="">All roles</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="label-text" htmlFor="q-topic">Topic</label>
                <select id="q-topic" className="select" value={filters.topic} onChange={set('topic')}>
                  <option value="">All topics</option>
                  {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="label-text" htmlFor="q-cat">Category</label>
                <select id="q-cat" className="select" value={filters.category} onChange={set('category')}>
                  <option value="">All</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="label-text" htmlFor="q-diff">Difficulty</label>
                <select id="q-diff" className="select" value={filters.difficulty} onChange={set('difficulty')}>
                  <option value="">All levels</option>
                  {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="mt">
            {list.error ? <ErrorState message={api.errorMessage(list.error)} onRetry={list.reload} /> : list.loading && !list.data ? (
              <div className="stack"><Skeleton height={70} /><Skeleton height={70} /><Skeleton height={70} /></div>
            ) : list.data.length === 0 ? (
              <Card><EmptyState icon={FiBookOpen} title="No questions match" text="Try different filters." /></Card>
            ) : (
              <>
                <p className="muted small">{list.data.length} question{list.data.length === 1 ? '' : 's'}</p>
                {shown.map((q) => <QuestionItem key={q.id} q={q} marked={isMarked(q)} onToggle={toggle} />)}
                {visible < list.data.length && <div className="center"><Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Show more</Button></div>}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'bookmarks' && (
        marks.error ? <ErrorState message={api.errorMessage(marks.error)} onRetry={marks.reload} /> : marks.loading && !marks.data ? <Skeleton height={80} /> : bookmarkList.length === 0 ? (
          <Card><EmptyState icon={FiBookmark} title="No bookmarks yet" text="Tap the bookmark icon on any question, or on your results page, to save it for revision." /></Card>
        ) : bookmarkList.map((q) => <QuestionItem key={q.id} q={q} detail={q} marked onToggle={toggle} />)
      )}
    </div>
  )
}
