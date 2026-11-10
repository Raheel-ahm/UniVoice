import { Router } from 'express'
import { z } from 'zod'
import { db } from '../supabase.js'
import { HttpError, fromDbError, must } from '../lib/errors.js'
import { parse, uuid, note, status } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'
import { toIssueDto } from './issues.js'
import {
  TECHNICIANS,
  assignIssue,
  getAssignment,
  getTechniciansWithStats,
} from '../services/assignments.js'

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

// ---------------------------------------------------------------------------
// Technical Team: list technicians with active jobs and dispatch channels
// ---------------------------------------------------------------------------
staffRouter.get('/technicians', async (req, res) => {
  const rows = must(
    await db
      .from('issues')
      .select('id, title, building, room, priority, status')
      .limit(1000),
  )
  const team = getTechniciansWithStats(rows)
  res.json({ technicians: team })
})

// ---------------------------------------------------------------------------
// Issues: list all issues with technician assignment data attached
// Service-role queries the base tables directly (security_invoker views filter
// out all rows when auth.uid() is null under the service role).
// ---------------------------------------------------------------------------
staffRouter.get('/issues', async (req, res) => {
  let query = db
    .from('issues')
    .select(
      `id, title, description, building, room, image_path,
       category_id, priority, status, reporter_count, ai_used,
       due_at, created_at, updated_at, resolved_at,
       categories!inner(name),
       departments!inner(id, name)`,
    )
    .order('created_at', { ascending: false })
    .limit(1000)

  // Allow filtering by department if specified; otherwise return each and every report across campus
  const deptParam = req.query.department_id
  if (deptParam && deptParam !== 'all' && deptParam !== 'undefined') {
    query = query.eq('department_id', Number(deptParam))
  }

  const rawRows = must(await query)
  // Normalize joined table fields to flat DTO shape matching issue_overview columns
  const rows = rawRows.map((r) => ({
    ...r,
    category_name: r.categories?.name ?? null,
    department_id: r.departments?.id ?? null,
    department_name: r.departments?.name ?? null,
    is_overdue: ['open', 'in_progress'].includes(r.status) && r.due_at && new Date(r.due_at) < new Date(),
    categories: undefined,
    departments: undefined,
  }))
  const issues = rows
    .map(toIssueDto)
    .map((issue) => {
      const assignment = getAssignment(issue.id)
      return {
        ...issue,
        assigned_technician: assignment?.technician_name ?? null,
        assigned_technician_id: assignment?.technician_id ?? null,
        assigned_at: assignment?.assigned_at ?? null,
        assignment_note: assignment?.note ?? null,
      }
    })
    .sort(compareForTriage)

  const summary = {
    open: issues.filter((i) => i.status === 'open').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    overdue: issues.filter((i) => i.is_overdue).length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    closed: issues.filter((i) => i.status === 'closed').length,
    assigned: issues.filter((i) => Boolean(i.assigned_technician)).length,
    unassigned: issues.filter((i) => !i.assigned_technician && (i.status === 'open' || i.status === 'in_progress')).length,
    total: issues.length,
  }

  const activeDeptName = deptParam && deptParam !== 'all'
    ? (issues[0]?.department_name || req.user.departmentName || 'Department')
    : 'All Campus Facilities'

  res.json({ department: activeDeptName, summary, issues })
})

// ---------------------------------------------------------------------------
// Manager: Assign task / issue to a technical team member
// ---------------------------------------------------------------------------
const assignSchema = z.object({
  technician_id: z.string().min(1, 'Technician ID is required'),
  technician_name: z.string().min(1, 'Technician Name is required'),
  note: z.string().max(500).optional(),
})

staffRouter.patch('/issues/:id/assign', async (req, res) => {
  const issueId = parse(uuid, req.params.id)
  const input = parse(assignSchema, req.body)

  // Verify technician exists in roster
  const tech = TECHNICIANS.find((t) => t.id === input.technician_id) || {
    id: input.technician_id,
    name: input.technician_name,
  }

  const assignment = await assignIssue(
    issueId,
    tech.id,
    input.technician_name || tech.name,
    req.user.id,
    input.note,
  )

  res.json({
    ok: true,
    issue_id: issueId,
    assigned_technician: assignment.technician_name,
    assigned_technician_id: assignment.technician_id,
    assigned_at: assignment.assigned_at,
  })
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
