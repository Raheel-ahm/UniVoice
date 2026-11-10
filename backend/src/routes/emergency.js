import { Router } from 'express'
import { config } from '../config.js'

export const emergencyRouter = Router()

function renderEmergencyHtml() {
  const phone = config.campusSecurityPhone
  const telLink = phone.replace(/[^0-9+]/g, '') || '911'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campus Emergency - UniVoice</title>
  <style>
    :root {
      --bg: #fff5f5;
      --card-bg: #ffffff;
      --danger: #b42318;
      --danger-dark: #7a140d;
      --danger-light: #fef3f2;
      --border: #fee4e2;
      --text: #1d2939;
      --muted: #475467;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .emergency-card {
      background: var(--card-bg);
      border: 2px solid var(--danger);
      border-radius: 12px;
      max-width: 640px;
      width: 100%;
      padding: 32px 28px;
      box-shadow: 0 10px 25px -5px rgba(180, 35, 24, 0.15), 0 8px 10px -6px rgba(180, 35, 24, 0.1);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--danger-light);
      color: var(--danger);
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }
    h1 {
      font-size: 1.75rem;
      color: var(--danger);
      line-height: 1.25;
      margin-bottom: 12px;
    }
    .lead {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 20px;
    }
    .alert-box {
      background: var(--danger-light);
      border-left: 4px solid var(--danger);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      color: var(--danger-dark);
      font-size: 0.95rem;
    }
    .call-action {
      margin: 24px 0;
      text-align: center;
    }
    .call-btn {
      display: block;
      width: 100%;
      background: var(--danger);
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 1.25rem;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(180, 35, 24, 0.3);
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .call-btn:hover {
      background: var(--danger-dark);
      transform: translateY(-1px);
    }
    .guidance-list {
      margin: 20px 0;
      padding-left: 20px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .guidance-list li {
      margin-bottom: 8px;
    }
    .contacts {
      border-top: 1px solid #eaecf0;
      margin-top: 24px;
      padding-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .contact-item h4 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .contact-item p {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text);
    }
    .actions {
      margin-top: 28px;
      text-align: center;
      border-top: 1px solid #eaecf0;
      padding-top: 16px;
    }
    .back-link {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.9rem;
    }
    .back-link:hover {
      color: var(--text);
      text-decoration: underline;
    }
    @media (max-width: 500px) {
      .contacts { grid-template-columns: 1fr; }
      .call-btn { font-size: 1.1rem; padding: 14px 16px; }
    }
  </style>
</head>
<body>
  <main class="emergency-card">
    <div class="badge">
      <span>🚨</span>
      <span>Immediate Safety Hazard</span>
    </div>

    <h1>Call Campus Security Directly</h1>
    <p class="lead">Do not wait for a maintenance report ticket.</p>

    <div class="alert-box">
      <strong>Standard reports are not monitored 24/7 for instant dispatch.</strong>
      <p style="margin-top: 6px;">If this situation poses an active danger to health, life, or structural safety, report it to Campus Security immediately.</p>
    </div>

    <div class="call-action">
      <a href="tel:${telLink}" class="call-btn">
        📞 Call Campus Security: ${phone}
      </a>
    </div>

    <p style="font-weight: 600; margin-bottom: 8px;">Treat as an emergency if you see:</p>
    <ul class="guidance-list">
      <li><strong>Fire or Smoke:</strong> Pull nearest alarm pull station and evacuate immediately.</li>
      <li><strong>Gas Smell or Chemical Hazard:</strong> Do not touch light switches; evacuate area.</li>
      <li><strong>Exposed Live Electrical Wiring / Sparks:</strong> Keep everyone away; risk of electrocution.</li>
      <li><strong>Flooding near electrical panels / outlets:</strong> Do not step in standing water.</li>
      <li><strong>Trapped in Elevator:</strong> Use the elevator emergency intercom button or call security.</li>
    </ul>

    <div class="contacts">
      <div class="contact-item">
        <h4>Campus Security Desk (24/7)</h4>
        <p>${phone}</p>
      </div>
      <div class="contact-item">
        <h4>Municipal Emergency Services</h4>
        <p>911 / 999 / 112</p>
      </div>
    </div>

    <div class="actions">
      <a href="/" class="back-link">← Return to UniVoice Maintenance Reporting</a>
    </div>
  </main>
</body>
</html>`
}

// Static emergency screen
emergencyRouter.get('/', (req, res) => {
  if (req.accepts('html') && !req.xhr && !req.headers['x-requested-with'] && req.headers['sec-fetch-dest'] === 'document') {
    return res.type('html').send(renderEmergencyHtml())
  }
  res.json({
    emergency: true,
    title: 'Campus Emergency Protocol',
    security_phone: config.campusSecurityPhone,
    message: 'For active emergencies (fire, electrical sparks, gas leak, security threats), do not submit an online ticket. Call Campus Security directly.',
    screen_url: '/emergency',
  })
})

emergencyRouter.get('/screen', (_req, res) => {
  res.type('html').send(renderEmergencyHtml())
})
