import { Router } from 'express'
import { z } from 'zod'
import { db } from '../supabase.js'
import { HttpError, fromDbError, must } from '../lib/errors.js'
import { parse, uuid, issueText, note, priority, id } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'
import { rateLimit } from '../lib/rateLimit.js'
import { readSuggestionToken } from '../lib/suggestionToken.js'
import { imageUpload, storeImage, removeImage, signedImageUrl } from '../services/images.js'
import { getAssignment } from '../services/assignments.js'

export const issuesRouter = Router()

// Columns safe to send to any viewer. issue_overview has no reporter columns,
// and image_path is replaced by a short-lived signed URL.
const ISSUE_COLUMNS = [
  'id', 'title', 'description', 'building', 'room', 'image_path',
  'category_id', 'category_name', 'department_id', 'department_name',
  'priority', 'status', 'ai_used', 'ai_category_id', 'ai_department_id', 'ai_priority',
  'reporter_count', 'due_at', 'created_at', 'updated_at', 'resolved_at', 'is_overdue',
].join(', ')

export function toIssueDto(row) {
  const { image_path, ...rest } = row
  return { ...rest, has_image: Boolean(image_path) }
}

// ---------------------------------------------------------------------------
// Reporter: duplicate check (step before submitting)
// ---------------------------------------------------------------------------
const duplicateSchema = z.object({
  title: issueText.title,
  description: issueText.description,
  building: issueText.building,
  room: issueText.room,
  category_id: id.optional(),
})

issuesRouter.post('/duplicates', requireRole('reporter'), async (req, res) => {
  const input = parse(duplicateSchema, req.body)
  const candidates = must(
    await db.rpc('uv_find_duplicate_issues', {
      p_building: input.building,
      p_category_id: input.category_id ?? null,
      p_room: input.room,
      p_title: input.title,
      p_description: input.description,
      p_limit: 5,
    }),
  )

  // Tell the student which of these they are already linked to.
  const ids = candidates.map((c) => c.id)
  const linked = ids.length
    ? must(
        await db.from('issue_reporters').select('issue_id').eq('reporter_id', req.user.id).in('issue_id', ids),
      ).map((r) => r.issue_id)
    : []

  res.json({
    duplicates: candidates.map((c) => ({ ...c, already_joined: linked.includes(c.id) })),
  })
})

// ---------------------------------------------------------------------------
// Reporter: submit a new issue
// ---------------------------------------------------------------------------
const createSchema = z.object({
  ...issueText,
  category_id: id,
  department_id: id,
  priority,
  note,
  ai_token: z.string().max(2000).optional(),
})

issuesRouter.post(
  '/',
  requireRole('reporter'),
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'You have submitted many reports recently. Please try again later.' }),
  imageUpload.single('image'),
  async (req, res) => {
    const input = parse(createSchema, req.body)
    const ai = readSuggestionToken(input.ai_token, req.user.id)
    if (input.ai_token && !ai) {
      // Expired or invalid token: still accept the report, just without AI data.
      console.warn('Ignoring invalid or expired AI suggestion token')
    }

    const imagePath = req.file ? await storeImage(req.file) : null

    const { data: issueId, error } = await db.rpc('uv_create_issue', {
      p_reporter: req.user.id,
      p_title: input.title,
      p_description: input.description,
      p_building: input.building,
      p_room: input.room,
      p_image_path: imagePath,
      p_category_id: input.category_id,
      p_department_id: input.department_id,
      p_priority: input.priority,
      p_ai_used: Boolean(ai),
      p_ai_category_id: ai?.categoryId ?? null,
      p_ai_department_id: ai?.departmentId ?? null,
      p_ai_priority: ai?.priority ?? null,
      p_note: input.note,
    })
    if (error) {
      await removeImage(imagePath)
      throw fromDbError(error)
    }

    res.status(201).json({ id: issueId })
  },
)

// ---------------------------------------------------------------------------
// Reporter: join an existing issue (only after confirming it is the same)
// ---------------------------------------------------------------------------
issuesRouter.post('/:id/join', requireRole('reporter'), async (req, res) => {
  const issueId = parse(uuid, req.params.id)
  const { note: joinNote } = parse(z.object({ note }), req.body ?? {})
  const joined = must(
    await db.rpc('uv_join_issue', { p_issue: issueId, p_reporter: req.user.id, p_note: joinNote }),
  )
  res.json({ id: issueId, joined })
})

// ---------------------------------------------------------------------------
// Reporter: my reports
// ---------------------------------------------------------------------------
issuesRouter.get('/mine', requireRole('reporter'), async (req, res) => {
  const links = must(
    await db
      .from('issue_reporters')
      .select('issue_id, is_original, joined_at, note')
      .eq('reporter_id', req.user.id),
  )
  if (links.length === 0) return res.json({ issues: [] })

  // Query base issues table (service role bypasses RLS; security_invoker view does not)
  const rawRows = must(
    await db
      .from('issues')
      .select(`id, title, description, building, room, image_path,
               category_id, priority, status, ai_used, ai_category_id, ai_department_id, ai_priority,
               reporter_count, due_at, created_at, updated_at, resolved_at,
               categories!inner(name),
               departments!inner(id, name)`)
      .in('id', links.map((l) => l.issue_id)),
  )
  const rows = rawRows.map((r) => ({
    ...r,
    category_name: r.categories?.name ?? null,
    department_id: r.departments?.id ?? null,
    department_name: r.departments?.name ?? null,
    is_overdue: ['open', 'in_progress'].includes(r.status) && r.due_at && new Date(r.due_at) < new Date(),
    categories: undefined,
    departments: undefined,
  }))
  const linkById = new Map(links.map((l) => [l.issue_id, l]))
  const issues = rows
    .map((row) => {
      const link = linkById.get(row.id)
      return { ...toIssueDto(row), is_original: link.is_original, joined_at: link.joined_at }
    })
    .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))

  res.json({ issues })
})

// ---------------------------------------------------------------------------
// Issue detail (reporter linked to it, or staff of its department)
// ---------------------------------------------------------------------------
issuesRouter.get('/:id', async (req, res) => {
  const issueId = parse(uuid, req.params.id)
  // Query the base issues table directly (service role bypasses RLS on tables;
  // the security_invoker view filters all rows when auth.uid() is null).
  const row = must(
    await db
      .from('issues')
      .select(`id, title, description, building, room, image_path,
               category_id, priority, status, ai_used, ai_category_id, ai_department_id, ai_priority,
               reporter_count, due_at, created_at, updated_at, resolved_at,
               categories!inner(name),
               departments!inner(id, name)`)
      .eq('id', issueId)
      .maybeSingle(),
  )
  if (!row) throw new HttpError(404, 'Issue not found')

  // Flatten joined table names to match the DTO shape
  const flatRow = {
    ...row,
    category_name: row.categories?.name ?? null,
    department_id: row.departments?.id ?? null,
    department_name: row.departments?.name ?? null,
    is_overdue: ['open', 'in_progress'].includes(row.status) && row.due_at && new Date(row.due_at) < new Date(),
    categories: undefined,
    departments: undefined,
  }

  const isStaff = req.user.role === 'staff'
  let myLink = null
  if (!isStaff) {
    myLink = must(
      await db
        .from('issue_reporters')
        .select('is_original, joined_at, note')
        .eq('issue_id', issueId)
        .eq('reporter_id', req.user.id)
        .maybeSingle(),
    )
    if (!myLink) throw new HttpError(404, 'Issue not found')
  }

  const history = must(
    await db
      .from('status_history')
      .select('id, old_status, new_status, note, changed_at, profiles(full_name)')
      .eq('issue_id', issueId)
      .order('changed_at'),
  ).map((h) => ({
    id: h.id,
    old_status: h.old_status,
    new_status: h.new_status,
    note: h.note,
    changed_at: h.changed_at,
    // Staff names are shown to other staff; students just see "Maintenance staff".
    changed_by: isStaff ? (h.profiles?.full_name ?? 'Staff') : 'Maintenance staff',
  }))

  const assignment = getAssignment(issueId)

  const result = {
    issue: {
      ...toIssueDto(flatRow),
      image_url: await signedImageUrl(flatRow.image_path),
      assigned_technician: assignment?.technician_name ?? null,
      assigned_technician_id: assignment?.technician_id ?? null,
      assigned_at: assignment?.assigned_at ?? null,
      assignment_note: assignment?.note ?? null,
    },
    history,
  }

  if (isStaff) {
    // Extra details from every reporter, with no identities attached.
    const notes = must(
      await db.from('issue_reporters').select('note, joined_at').eq('issue_id', issueId).not('note', 'is', null),
    )
    result.reporter_notes = notes.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
  } else {
    result.my_link = myLink
  }

  res.json(result)
})
