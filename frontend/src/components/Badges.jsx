import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/constants.js'

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`badge priority-${priority}`}>{PRIORITY_LABELS[priority] ?? priority} priority</span>
}

export function OverdueBadge() {
  return <span className="badge overdue">Overdue · escalated</span>
}
