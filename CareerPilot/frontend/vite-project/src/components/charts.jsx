import { scoreTone } from '../utils/format'
import { formatDate } from '../utils/format'

const TONE_COLOR = { good: '#34d399', ok: '#fbbf24', low: '#f87171', neutral: '#4fd1ff' }

export function ScoreRing({ score, size = 130, label = 'score' }) {
  const stroke = 11
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const value = Math.max(0, Math.min(100, score || 0))
  const color = TONE_COLOR[scoreTone(score)]
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${value} percent ${label}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="ring-text">
        <strong>{value}%</strong>
        <span className="muted small">{label}</span>
      </div>
    </div>
  )
}

/** Score-over-time chart. points: [{ id, date, score, role, interviewType }] in time order. */
export function LineChart({ points }) {
  const W = 640
  const H = 240
  const pad = { l: 34, r: 14, t: 14, b: 30 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const n = points.length
  const x = (i) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => pad.t + innerH - (v / 100) * innerH
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ')

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Score trend over ${n} interview${n === 1 ? '' : 's'}`}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.08)" />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end">{g}</text>
        </g>
      ))}
      {n > 1 && <path d={path} fill="none" stroke="#4fd1ff" strokeWidth="2.5" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={p.id ?? i} cx={x(i)} cy={y(p.score)} r="5" fill="#08111f" stroke="#4fd1ff" strokeWidth="2.5">
          <title>{`${formatDate(p.date)} - ${p.score}% (${p.role})`}</title>
        </circle>
      ))}
      <text x={x(0)} y={H - 8} textAnchor={n === 1 ? 'middle' : 'start'}>{formatDate(points[0].date)}</text>
      {n > 1 && <text x={x(n - 1)} y={H - 8} textAnchor="end">{formatDate(points[n - 1].date)}</text>}
    </svg>
  )
}

/** Horizontal bars. items: [{ label, value (0-100), note }] */
export function BarList({ items }) {
  return (
    <div>
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="name" title={item.label}>{item.label}</span>
          <div className={`progress ${scoreTone(item.value)}`} role="progressbar" aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={100} aria-label={item.label}>
            <span style={{ width: `${item.value}%` }} />
          </div>
          <span className="val">{item.value}%</span>
        </div>
      ))}
    </div>
  )
}
