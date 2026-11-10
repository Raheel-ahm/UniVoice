import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'

const ManagerContext = createContext(null)

const INITIAL_MOCK_ISSUES = [
  {
    id: 'm-101',
    title: 'Exposed live wiring in corridor ceiling panel',
    description: 'Ceiling tile collapsed exposing high voltage wiring harness near Room 302. Sparking reported during evening classes.',
    building: 'Science Block B',
    room: 'Corridor 3rd Floor',
    category_name: 'Electrical Fault',
    department_name: 'Electrical',
    priority: 'high',
    status: 'open',
    reporter_count: 5,
    has_image: true,
    ai_used: true,
    is_overdue: true, // Overdue!
    due_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    reporter_notes: [
      { note: 'Sparked twice when the lights flickered around 4 PM.', joined_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString() },
      { note: 'Students had to bypass the hallway. Need immediate electrician tape or power isolation.', joined_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
    ],
  },
  {
    id: 'm-102',
    title: 'Main circuit breaker tripping constantly in computer lab',
    description: 'Workstations 12 through 28 suddenly lose power when the GPU server rack turns on.',
    building: 'Engineering Hall C',
    room: 'Lab 104',
    category_name: 'Electrical Fault',
    department_name: 'Electrical',
    priority: 'high',
    status: 'in_progress',
    reporter_count: 3,
    has_image: false,
    ai_used: true,
    is_overdue: false,
    due_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    reporter_notes: [
      { note: 'Happened during midday machine learning lecture.', joined_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString() },
    ],
  },
  {
    id: 'm-103',
    title: 'Classroom projector power supply dead',
    description: 'Ceiling mount projector does not power on even after remote battery replacement and breaker reset.',
    building: 'Humanities Complex',
    room: 'Auditorium H-1',
    category_name: 'Equipment Failure',
    department_name: 'Electrical',
    priority: 'medium',
    status: 'open',
    reporter_count: 2,
    has_image: false,
    ai_used: true,
    is_overdue: false,
    due_at: new Date(Date.now() + 32 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    reporter_notes: [],
  },
  {
    id: 'm-104',
    title: 'Flickering fluorescent tubes in study carrels',
    description: 'Lamps buzz loudly and flicker continuously, causing eye strain for students studying.',
    building: 'Central Library',
    room: 'Quiet Study Area 2F',
    category_name: 'Lighting',
    department_name: 'Electrical',
    priority: 'low',
    status: 'open',
    reporter_count: 1,
    has_image: false,
    ai_used: true,
    is_overdue: false,
    due_at: new Date(Date.now() + 96 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    reporter_notes: [],
  },
  {
    id: 'm-105',
    title: 'Outdoor pathway solar bollard light shattered',
    description: 'Glass casing broken near the lake perimeter trail. Components intact, needs globe replacement.',
    building: 'North Campus Grounds',
    room: 'Pathway 4',
    category_name: 'Grounds & Infrastructure',
    department_name: 'Electrical',
    priority: 'low',
    status: 'resolved',
    resolved_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    reporter_count: 1,
    has_image: true,
    ai_used: true,
    is_overdue: false,
    due_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    reporter_notes: [],
  },
]

export function ManagerProvider({ children }) {
  const { user, activeDepartment } = useAuth()
  const [data, setData] = useState(null)
  const [mockIssues, setMockIssues] = useState(INITIAL_MOCK_ISSUES)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isUsingLiveApi, setIsUsingLiveApi] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback((dept = departmentFilter) => {
    const param = dept && dept !== 'all' ? `?department_id=${dept}` : ''
    api
      .get(`/staff/issues${param}`)
      .then((res) => {
        setData(res)
        setIsUsingLiveApi(true)
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Could not load live staff issues:', err)
        setIsUsingLiveApi(false)
        setLoading(false)
      })
  }, [departmentFilter])

  useEffect(() => {
    loadData(departmentFilter)
  }, [departmentFilter, loadData])

  const issues = useMemo(() => {
    if (isUsingLiveApi && data?.issues) return data.issues
    return mockIssues
  }, [isUsingLiveApi, data, mockIssues])

  const summary = useMemo(() => {
    if (isUsingLiveApi && data?.summary) return data.summary
    return {
      open: issues.filter((i) => i.status === 'open').length,
      in_progress: issues.filter((i) => i.status === 'in_progress').length,
      overdue: issues.filter((i) => i.is_overdue).length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      closed: issues.filter((i) => i.status === 'closed').length,
      total: issues.length,
    }
  }, [isUsingLiveApi, data, issues])

  const departmentName = (isUsingLiveApi && data?.department) || user?.departmentName || activeDepartment || 'Campus Operations'

  const updateStatus = useCallback(
    async (issueId, newStatus, note = '') => {
      if (isUsingLiveApi) {
        await api.patch(`/staff/issues/${issueId}/status`, { status: newStatus, note })
        loadData()
      } else {
        setMockIssues((prev) =>
          prev.map((item) => {
            if (item.id === issueId) {
              return {
                ...item,
                status: newStatus,
                updated_at: new Date().toISOString(),
                resolved_at: newStatus === 'resolved' ? new Date().toISOString() : item.resolved_at,
                reporter_notes: note
                  ? [...(item.reporter_notes || []), { note: `Staff update: ${note}`, joined_at: new Date().toISOString() }]
                  : item.reporter_notes,
              }
            }
            return item
          }),
        )
      }
    },
    [isUsingLiveApi, loadData],
  )

  return (
    <ManagerContext.Provider
      value={{
        departmentName,
        departmentFilter,
        setDepartmentFilter,
        issues,
        summary,
        loading,
        loadData,
        updateStatus,
        isUsingLiveApi,
      }}
    >
      {children}
    </ManagerContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useManager() {
  return useContext(ManagerContext)
}
