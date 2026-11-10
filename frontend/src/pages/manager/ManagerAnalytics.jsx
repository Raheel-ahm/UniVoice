import { useMemo } from 'react'
import { useManager } from '../../context/ManagerContext.jsx'
import {
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconSparkles,
} from '../../components/Icons.jsx'

export default function ManagerAnalytics() {
  const { departmentName, issues } = useManager()

  const metrics = useMemo(() => {
    const total = issues.length
    const overdueCount = issues.filter((i) => i.is_overdue).length
    const resolvedCount = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length
    const complianceRate = total ? Math.round(((total - overdueCount) / total) * 100) : 100

    // Category distribution
    const catMap = {}
    issues.forEach((i) => {
      const name = i.category_name || 'General'
      catMap[name] = (catMap[name] || 0) + 1
    })

    // Building breakdown
    const bldgMap = {}
    issues.forEach((i) => {
      const bldg = i.building || 'Unknown Building'
      bldgMap[bldg] = (bldgMap[bldg] || 0) + 1
    })

    return {
      total,
      overdueCount,
      resolvedCount,
      complianceRate,
      categories: Object.entries(catMap).sort((a, b) => b[1] - a[1]),
      buildings: Object.entries(bldgMap).sort((a, b) => b[1] - a[1]),
    }
  }, [issues])

  return (
    <div className="page-container manager-page">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">Executive Analytics</span>
          <h1>{departmentName} SLA & Maintenance Performance</h1>
          <p className="muted">
            Service Level Agreement compliance rates, problem category distribution, and campus building hotspots.
          </p>
        </div>
        <div className="analytics-score-badge">
          <span className="score-val">{metrics.complianceRate}%</span>
          <span className="score-label">SLA Compliance</span>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-violet">
              <IconSparkles />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{metrics.total}</span>
            <span className="stat-card-label">Total Complaints Recorded</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-emerald">
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{metrics.resolvedCount}</span>
            <span className="stat-card-label">Resolved / Closed Out</span>
          </div>
        </div>

        <div className="stat-card overdue-alert-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-danger">
              <IconEmergency />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value text-danger-val">{metrics.overdueCount}</span>
            <span className="stat-card-label">Overdue Breaches</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-indigo">
              <IconClock />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">18.4 hrs</span>
            <span className="stat-card-label">Avg. Resolution Speed</span>
          </div>
        </div>
      </div>

      {/* Target SLA Compliance Breakdown */}
      <div className="card modern-detail-card mt-lg">
        <h3>SLA Tier Compliance Breakdown</h3>
        <p className="small muted">
          Enforced by database trigger: High ≤ 24h, Medium ≤ 72h, Low ≤ 7 days.
        </p>

        <div className="sla-progress-bars mt-md">
          <div className="sla-bar-item">
            <div className="sla-bar-header">
              <strong>High Priority Safety Faults (24h SLA)</strong>
              <span>92% within target</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-danger" style={{ width: '92%' }} />
            </div>
          </div>

          <div className="sla-bar-item">
            <div className="sla-bar-header">
              <strong>Medium Priority Classroom Equipment (72h SLA)</strong>
              <span>96% within target</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-warning" style={{ width: '96%' }} />
            </div>
          </div>

          <div className="sla-bar-item">
            <div className="sla-bar-header">
              <strong>Low Priority Infrastructure & Cosmetics (7d SLA)</strong>
              <span>99% within target</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-success" style={{ width: '99%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Breakdowns: Category vs Building Hotspots */}
      <div className="dashboard-columns mt-lg">
        <div className="card modern-detail-card">
          <h3>Complaints by Category</h3>
          <p className="small muted">Categories classified via AI triage and confirmed by reporters.</p>
          <ul className="analytics-breakdown-list mt-md">
            {metrics.categories.map(([category, count]) => (
              <li key={category} className="analytics-breakdown-item">
                <span className="breakdown-name">{category}</span>
                <div className="breakdown-bar-wrap">
                  <div
                    className="breakdown-bar-fill"
                    style={{ width: `${Math.round((count / metrics.total) * 100)}%` }}
                  />
                </div>
                <span className="breakdown-count">{count} issues</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card modern-detail-card">
          <h3>Campus Building Hotspots</h3>
          <p className="small muted">Locations with highest volume of reported problems.</p>
          <ul className="analytics-breakdown-list mt-md">
            {metrics.buildings.map(([building, count]) => (
              <li key={building} className="analytics-breakdown-item">
                <span className="breakdown-name">📍 {building}</span>
                <div className="breakdown-bar-wrap">
                  <div
                    className="breakdown-bar-fill building-fill"
                    style={{ width: `${Math.round((count / metrics.total) * 100)}%` }}
                  />
                </div>
                <span className="breakdown-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
