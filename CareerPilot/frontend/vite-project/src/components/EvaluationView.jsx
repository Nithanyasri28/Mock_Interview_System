import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { scoreTone } from '../utils/format'
import { ProgressBar } from './ui'

const PARTS = [
  { key: 'keywordScore', label: 'Key concepts' },
  { key: 'relevanceScore', label: 'Relevance' },
  { key: 'completenessScore', label: 'Completeness' },
  { key: 'clarityScore', label: 'Clarity' },
]

/** Shows the score breakdown, matched/missing concepts and feedback for one evaluated answer. */
export default function EvaluationView({ evaluation, answered = true }) {
  const matched = evaluation.matchedKeywords || []
  const missing = evaluation.missingKeywords || []
  return (
    <div className="stack">
      {answered && (
        <div className="mini-bars">
          {PARTS.map((p) => (
            <div key={p.key}>
              <div className="small muted">{p.label} <strong style={{ color: 'var(--text)' }}>{evaluation[p.key]}%</strong></div>
              <ProgressBar value={evaluation[p.key]} tone={scoreTone(evaluation[p.key])} label={p.label} />
            </div>
          ))}
        </div>
      )}

      {evaluation.feedback && <p style={{ marginBottom: 0 }}>{evaluation.feedback}</p>}

      {answered && (matched.length > 0 || missing.length > 0) && (
        <div className="grid grid-2">
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}><FiCheckCircle aria-hidden="true" /> Concepts you covered</div>
            <div className="chips">
              {matched.length === 0 && <span className="muted small">None detected</span>}
              {matched.map((k) => <span key={k} className="chip chip-static chip-good">{k}</span>)}
            </div>
          </div>
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}><FiAlertTriangle aria-hidden="true" /> Missing concepts</div>
            <div className="chips">
              {missing.length === 0 && <span className="muted small">Nothing missing</span>}
              {missing.map((k) => <span key={k} className="chip chip-static chip-low">{k}</span>)}
            </div>
          </div>
        </div>
      )}

      {typeof evaluation.fillerWordCount === 'number' && (
        <p className="small muted" style={{ marginBottom: 0 }}>
          Filler words found in your spoken transcript: <strong>{evaluation.fillerWordCount}</strong>
        </p>
      )}

      {evaluation.referenceAnswer && (
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>Reference answer</div>
          <div className="answer-quote" style={{ borderLeftColor: 'var(--accent-2)' }}>{evaluation.referenceAnswer}</div>
        </div>
      )}
    </div>
  )
}
