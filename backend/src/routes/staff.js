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
  let query = db
    .from('issue_overview')
    .select(
      'id, title, description, building, room, image_path, category_id, category_name, department_id, department_name, priority, status, reporter_count, ai_used, due_at, created_at, updated_at, resolved_at, is_overdue',
    )
    .order('created_at', { ascending: false })
    .limit(1000)

  // Allow filtering by department if specified; otherwise return each and every report across campus
  const deptParam = req.query.department_id
  if (deptParam && deptParam !== 'all' && deptParam !== 'undefined') {
    query = query.eq('department_id', Number(deptParam))
  }

  const rows = must(await query)
  const issues = rows.map(toIssueDto).sort(compareForTriage)
  const summary = {
    open: issues.filter((i) => i.status === 'open').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    overdue: issues.filter((i) => i.is_overdue).length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    closed: issues.filter((i) => i.status === 'closed').length,
    total: issues.length,
  }

  const activeDeptName = deptParam && deptParam !== 'all'
    ? (issues[0]?.department_name || req.user.departmentName || 'Department')
    : 'All Campus Facilities'

  res.json({ department: activeDeptName, summary, issues })
})

staffRouter.patch('/issues/:id/status', async (req, res) => {
  const issueId = parse(uuid, req.params.id)
  const input = parse(z.object({ status, note }), req.body)

  // Verify issue exists
  const { data: issue, error: findError } = await db
    .from('issues')
    .select('id, status, department_id')
    .eq('id', issueId)
    .single()

  if (findError || !issue) throw new HttpError(404, 'Issue not found')
  if (issue.status === input.status) throw new HttpError(409, `Issue is already ${input.status}`)

  if (!input.note?.trim() && (
    (issue.status === 'open' && input.status === 'closed') ||
    (issue.status === 'resolved' && input.status === 'in_progress')
  )) {
    throw new HttpError(400, 'A note is required to close without resolving or to reopen an issue.')
  }

  // Update status directly using service-role db client to allow managers to manage all student reports
  const { error: updateError } = await db
    .from('issues')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', issueId)

  if (updateError) throw fromDbError(updateError)

  // Record audit trail in status_history
  await db.from('status_history').insert({
    issue_id: issueId,
    old_status: issue.status,
    new_status: input.status,
    changed_by: req.user.id,
    note: input.note?.trim() || null,
  })

  res.json({ id: issueId, status: input.status })
})
