import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconEmergency, IconPhone, IconShield } from '../components/Icons.jsx'

export default function Emergency() {
  const { user } = useAuth()
  const home = user?.role === 'staff' ? '/staff' : '/dashboard'

  return (
    <div className="emergency-page">
      <div className="emergency-hero">
        <div className="emergency-pulse">
          <IconEmergency className="icon-emergency-large" />
        </div>
        <span className="emergency-tag">IMMEDIATE SAFETY DISPATCH</span>
        <h1>Campus Emergency Protocol</h1>
        <p className="emergency-subtitle">
          If there is an active fire, medical emergency, chemical leak, electrical hazard, or immediate danger to life,
          <strong> DO NOT submit a web maintenance report.</strong> Contact Campus Security immediately.
        </p>
      </div>

      <div className="emergency-grid">
        <div className="emergency-card primary-emergency">
          <div className="card-badge">24/7 Priority Line</div>
          <div className="emergency-card-header">
            <div className="emergency-icon-box danger">
              <IconPhone />
            </div>
            <div>
              <h3>Campus Security Control Room</h3>
              <p>Immediate response team, security guards & patrol dispatch</p>
            </div>
          </div>
          <div className="phone-number-box">
            <span className="phone-number">(555) 0199</span>
            <span className="phone-ext">or Ext. 199 from campus landlines</span>
          </div>
          <div className="emergency-actions">
            <a href="tel:5550199" className="btn btn-call-emergency">
              <IconPhone /> Call Security Now
            </a>
            <span className="location-pill">HQ: Main Gate Booth, Security Center</span>
          </div>
        </div>

        <div className="emergency-card">
          <div className="card-badge">Medical / Ambulance</div>
          <div className="emergency-card-header">
            <div className="emergency-icon-box medical">
              <IconShield />
            </div>
            <div>
              <h3>Campus Health Clinic & First Aid</h3>
              <p>On-duty medical officers, emergency resuscitation & paramedic transit</p>
            </div>
          </div>
          <div className="phone-number-box">
            <span className="phone-number">(555) 0911</span>
            <span className="phone-ext">or Ext. 911 from campus landlines</span>
          </div>
          <div className="emergency-actions">
            <a href="tel:5550911" className="btn btn-call-secondary">
              <IconPhone /> Call Medical Clinic
            </a>
            <span className="location-pill">Clinic: Student Center, Ground Floor</span>
          </div>
        </div>

        <div className="emergency-card">
          <div className="card-badge">Hazards & Fire</div>
          <div className="emergency-card-header">
            <div className="emergency-icon-box warning">
              <IconEmergency />
            </div>
            <div>
              <h3>Fire & Critical Infrastructure</h3>
              <p>Gas leak containment, high voltage line rupture & flood response</p>
            </div>
          </div>
          <div className="phone-number-box">
            <span className="phone-number">(555) 0999</span>
            <span className="phone-ext">or Ext. 999 from campus landlines</span>
          </div>
          <div className="emergency-actions">
            <a href="tel:5550999" className="btn btn-call-secondary">
              <IconPhone /> Call Fire Safety
            </a>
            <span className="location-pill">Station: Engineering Complex South</span>
          </div>
        </div>
      </div>

      <div className="emergency-protocol-card">
        <h3>Emergency Action Checklist</h3>
        <div className="protocol-steps">
          <div className="protocol-step">
            <span className="step-num">1</span>
            <div>
              <strong>Prioritize Human Life</strong>
              <p>Evacuate people from the hazardous area. Do not attempt to fix live electrical wires or structural collapses.</p>
            </div>
          </div>
          <div className="protocol-step">
            <span className="step-num">2</span>
            <div>
              <strong>Give Exact Location</strong>
              <p>State your Building Name, Floor, and Room number clearly when speaking with the Security Operator.</p>
            </div>
          </div>
          <div className="protocol-step">
            <span className="step-num">3</span>
            <div>
              <strong>Keep Lines Open</strong>
              <p>Stay nearby at a safe distance to direct emergency personnel when sirens arrive.</p>
            </div>
          </div>
        </div>

        <div className="emergency-footer-actions">
          <Link to={home} className="btn btn-ghost">
            ← Return to Dashboard
          </Link>
          <span className="emergency-notice-note">
            Non-hazardous campus repairs (furniture, minor leaks, lights) should be reported through the standard report form.
          </span>
        </div>
      </div>
    </div>
  )
}

