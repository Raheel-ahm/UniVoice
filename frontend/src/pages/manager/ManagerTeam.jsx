import { useState } from 'react'
import { useManager } from '../../context/ManagerContext.jsx'
import {
  IconCheckCircle,
  IconEmergency,
  IconWrench,
} from '../../components/Icons.jsx'

const MOCK_TECHNICIANS = [
  {
    id: 't-1',
    name: 'David Miller',
    role: 'Lead Senior Electrician',
    status: 'online',
    zone: 'Science Block A, B & C',
    radio: 'Ch. 4 (Ext. 210)',
    activeJobs: 2,
    completedToday: 3,
  },
  {
    id: 't-2',
    name: 'Sarah Chen',
    role: 'Facilities & Power Systems Tech',
    status: 'online',
    zone: 'Central Library & Student Center',
    radio: 'Ch. 4 (Ext. 214)',
    activeJobs: 1,
    completedToday: 4,
  },
  {
    id: 't-3',
    name: 'Marcus Vance',
    role: 'HVAC & Circuit Maintenance',
    status: 'busy',
    zone: 'Engineering Complex & Labs',
    radio: 'Ch. 5 (Ext. 219)',
    activeJobs: 3,
    completedToday: 2,
  },
  {
    id: 't-4',
    name: 'Elena Rostova',
    role: 'Low Voltage & Audio-Visual Systems',
    status: 'online',
    zone: 'Humanities & Main Auditorium',
    radio: 'Ch. 4 (Ext. 222)',
    activeJobs: 0,
    completedToday: 5,
  },
  {
    id: 't-5',
    name: 'James Walker',
    role: 'Plumbing & Hydraulic Infrastructure',
    status: 'on_call',
    zone: 'Dormitories North & South',
    radio: 'Emergency Line (Ext. 290)',
    activeJobs: 1,
    completedToday: 2,
  },
]

export default function ManagerTeam() {
  const { departmentName } = useManager()
  const [team] = useState(MOCK_TECHNICIANS)
  const [dispatchedId, setDispatchedId] = useState(null)

  function handleDispatch(techName) {
    setDispatchedId(techName)
    setTimeout(() => setDispatchedId(null), 3000)
  }

  return (
    <div className="page-container manager-page">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">Staff Operations</span>
          <h1>{departmentName} Field Technicians & Duty Roster</h1>
          <p className="muted">
            On-duty personnel, assigned campus zones, radio dispatch channels, and workload balancing.
          </p>
        </div>
        <div className="head-stats-pills">
          <span className="pill-metric">
            <strong>{team.filter((t) => t.status === 'online').length}</strong> Active On Shift
          </span>
          <span className="pill-metric info">
            <strong>{team.length}</strong> Total Technicians
          </span>
        </div>
      </div>

      {dispatchedId && (
        <div className="alert alert-info">
          <strong>Radio Dispatch Transmitted:</strong> Paged {dispatchedId} for priority campus response.
        </div>
      )}

      {/* Technicians Grid */}
      <div className="technician-grid">
        {team.map((tech) => (
          <div key={tech.id} className="technician-card">
            <div className="tech-header">
              <div className="tech-avatar-circle">
                {tech.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="tech-info">
                <h3>{tech.name}</h3>
                <span className="tech-role">{tech.role}</span>
              </div>
              <span className={`tech-status-pill ${tech.status}`}>
                {tech.status === 'online' ? '● On Shift' : tech.status === 'busy' ? '● Working Job' : '● On Call'}
              </span>
            </div>

            <div className="tech-details-box">
              <div className="tech-detail-row">
                <span className="detail-key">Assigned Zone</span>
                <span className="detail-val">📍 {tech.zone}</span>
              </div>
              <div className="tech-detail-row">
                <span className="detail-key">Radio / Extension</span>
                <span className="detail-val">📻 {tech.radio}</span>
              </div>
              <div className="tech-detail-row">
                <span className="detail-key">Active Work Orders</span>
                <span className="detail-val">{tech.activeJobs} assigned</span>
              </div>
              <div className="tech-detail-row">
                <span className="detail-key">Completed Today</span>
                <span className="detail-val text-ok">
                  <IconCheckCircle /> {tech.completedToday} fixed
                </span>
              </div>
            </div>

            <div className="tech-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary btn-block"
                onClick={() => handleDispatch(tech.name)}
              >
                <IconWrench /> Dispatch to Priority Ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency On-Call Policy */}
      <div className="card notice-card mt-lg">
        <div className="notice-card-header">
          <h4>After-Hours Emergency On-Call Protocol</h4>
          <span className="badge-pill">24/7 Standby</span>
        </div>
        <p className="small muted">
          Between 6:00 PM and 7:00 AM, high-priority electrical or plumbing breaches automatically route through the
          Campus Security Control Room to the on-call supervisor.
        </p>
        <div className="emergency-call-bar mt-md">
          <IconEmergency />
          <span>Need immediate after-hours crew mobilization? Contact Security Dispatch: <strong>(555) 0199</strong></span>
        </div>
      </div>
    </div>
  )
}
