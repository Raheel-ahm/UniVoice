import { Router } from 'express'
import { z } from 'zod'
import { db } from '../supabase.js'
import { must } from '../lib/errors.js'
import { parse, uuid, note, status } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'
import { toIssueDto } from './issues.js'

export const staffRouter = Router()
staffRouter.use(requireRole('staff'))

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
const STATUS_RANK = { open: 0, in_progress: 1, resolved: 2, closed: 3 }

// Overdue (escalated) issues first, then by priority, then by due date.
function compareForTriage(a, b) {
  return (
    Number(b.is_overdue) - Number(a.is_overdue) ||
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    new Date(a.due_at) - new Date(b.due_at)
  )
}

staffRouter.get('/issues', async (req, res) => {
  const rows = must(
    await db
      .from('issue_overview')
      .select(
        'id, title, building, room, image_path, category_name, priority, status, reporter_count, ai_used, due_at, created_at, updated_at, resolved_at, is_overdue',
      )
      .eq('department_id', req.user.departmentId)
      .order('created_at', { ascending: false })
      .limit(500),
  )

  const issues = rows.map(toIssueDto).sort(compareForTriage)
  const summary = {
    open: issues.filter((i) => i.status === 'open').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    overdue: issues.filter((i) => i.is_overdue).length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    closed: issues.filter((i) => i.status === 'closed').length,
  }

  res.json({ department: req.user.departmentName, summary, issues })
})

staffRouter.patch('/issues/:id/status', async (req, res) => {
  const issueId = parse(uuid, req.params.id)
  const input = parse(z.object({ status, note }), req.body)
  must(
    await db.rpc('uv_change_issue_status', {
      p_issue: issueId,
      p_actor: req.user.id,
      p_new_status: input.status,
      p_note: input.note,
    }),
  )
  res.json({ id: issueId, status: input.status })
})
