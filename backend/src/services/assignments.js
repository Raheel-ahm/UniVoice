import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isVercel = Boolean(process.env.VERCEL)
const DATA_DIR = isVercel
  ? path.join('/tmp', 'univoice-data')
  : path.resolve(__dirname, '../../data')
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json')

export const TECHNICIANS = [
  {
    id: 't-1',
    name: 'David Miller',
    role: 'Lead Senior Electrician',
    department: 'Electrical',
    status: 'online',
    zone: 'Science Block A, B & C',
    radio: 'Ch. 4 (Ext. 210)',
  },
  {
    id: 't-2',
    name: 'Sarah Chen',
    role: 'Facilities & Power Systems Tech',
    department: 'Electrical',
    status: 'online',
    zone: 'Central Library & Student Center',
    radio: 'Ch. 4 (Ext. 214)',
  },
  {
    id: 't-3',
    name: 'Marcus Vance',
    role: 'HVAC & Circuit Maintenance',
    department: 'HVAC',
    status: 'busy',
    zone: 'Engineering Complex & Labs',
    radio: 'Ch. 5 (Ext. 219)',
  },
  {
    id: 't-4',
    name: 'Elena Rostova',
    role: 'Low Voltage & Audio-Visual Systems',
    department: 'IT & AV',
    status: 'online',
    zone: 'Humanities & Main Auditorium',
    radio: 'Ch. 4 (Ext. 222)',
  },
  {
    id: 't-5',
    name: 'James Walker',
    role: 'Plumbing & Hydraulic Infrastructure',
    department: 'Plumbing',
    status: 'on_call',
    zone: 'Dormitories North & South',
    radio: 'Emergency Line (Ext. 290)',
  },
  {
    id: 't-6',
    name: 'Carlos Mendez',
    role: 'Structural & Carpentry Specialist',
    department: 'Civil Infrastructure',
    status: 'online',
    zone: 'West Campus Buildings & Walkways',
    radio: 'Ch. 3 (Ext. 235)',
  },
  {
    id: 't-7',
    name: 'Amina Diallo',
    role: 'Janitorial & Sanitation Lead',
    department: 'Sanitation',
    status: 'online',
    zone: 'Campus Wide Facilities',
    radio: 'Ch. 2 (Ext. 201)',
  },
]

// In-memory assignment map: issueId -> { technician_id, technician_name, assigned_at, assigned_by, note }
let memoryAssignments = {}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadAssignments() {
  try {
    ensureDataDir()
    if (fs.existsSync(ASSIGNMENTS_FILE)) {
      const raw = fs.readFileSync(ASSIGNMENTS_FILE, 'utf8')
      memoryAssignments = JSON.parse(raw)
    }
  } catch (err) {
    console.error('Failed reading assignments cache:', err)
  }
}

function saveAssignments() {
  try {
    ensureDataDir()
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(memoryAssignments, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed writing assignments cache:', err)
  }
}

loadAssignments()

export function getAssignment(issueId) {
  return memoryAssignments[issueId] || null
}

export function getAllAssignments() {
  return { ...memoryAssignments }
}

export async function assignIssue(issueId, technicianId, technicianName, actorId, note = '') {
  const assignment = {
    technician_id: technicianId,
    technician_name: technicianName,
    assigned_at: new Date().toISOString(),
    assigned_by: actorId,
    note: note || '',
  }

  memoryAssignments[issueId] = assignment
  saveAssignments()

  // Verify and update issue in Supabase
  try {
    const { data: issue } = await db
      .from('issues')
      .select('id, status')
      .eq('id', issueId)
      .single()

    if (issue) {
      // If issue was open, automatically move to in_progress upon dispatch
      const newStatus = issue.status === 'open' ? 'in_progress' : issue.status
      if (newStatus !== issue.status) {
        await db
          .from('issues')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', issueId)
      }

      // Record in Supabase status_history
      const historyNote = `Assigned task to technician ${technicianName} (${technicianId})${note ? `: ${note}` : ''}`
      await db.from('status_history').insert({
        issue_id: issueId,
        old_status: issue.status,
        new_status: newStatus,
        changed_by: actorId,
        note: historyNote,
      })
    }
  } catch (dbErr) {
    console.warn('Could not record assignment in Supabase status_history:', dbErr.message)
  }

  return assignment
}

export function getTechniciansWithStats(issues = []) {
  return TECHNICIANS.map((tech) => {
    const assignedIssues = issues.filter((i) => {
      const a = memoryAssignments[i.id]
      return a && a.technician_id === tech.id
    })
    const activeJobs = assignedIssues.filter((i) => i.status === 'open' || i.status === 'in_progress').length
    const completedToday = assignedIssues.filter((i) => i.status === 'resolved' || i.status === 'closed').length

    return {
      ...tech,
      activeJobs,
      completedToday,
      assignedIssueIds: assignedIssues.map((i) => i.id),
      assignedIssues: assignedIssues.map((i) => ({
        id: i.id,
        title: i.title,
        building: i.building,
        room: i.room,
        priority: i.priority,
        status: i.status,
      })),
    }
  })
}

