import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PRIORITY_LABELS } from '../lib/constants.js'
import { formatDateTime } from '../lib/format.js'
import { StatusBadge } from '../components/Badges.jsx'
import {
  IconArrowRight,
  IconCamera,
  IconCheckCircle,
  IconEmergency,
  IconSparkles,
  IconUsers,
} from '../components/Icons.jsx'

const EMPTY_DETAILS = { title: '', description: '', building: '', room: '', note: '' }
const EMPTY_CLASS = { category_id: '', department_id: '', priority: '' }

export default function ReportIssue() {
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState(null)

  const [step, setStep] = useState('details') // details -> classify -> duplicates -> done
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [classification, setClassification] = useState(EMPTY_CLASS)
  const [departmentTouched, setDepartmentTouched] = useState(false)
  const [ai, setAi] = useState(null) // { available, suggestion?, token?, reason? }
  const [duplicates, setDuplicates] = useState([])
  const [result, setResult] = useState(null) // { id, joined, alreadyLinked }

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/meta').then(setCatalog).catch((err) => setCatalogError(err.message))
  }, [])

  const categoriesById = useMemo(
    () => new Map((catalog?.categories ?? []).map((c) => [c.id, c])),
    [catalog],
  )

  function updateDetails(field, value) {
    setDetails((d) => ({ ...d, [field]: value }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0] ?? null
    setImage(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  function resetAll() {
    setStep('details')
    setDetails(EMPTY_DETAILS)
    setImage(null)
    setImagePreview(null)
    setClassification(EMPTY_CLASS)
    setDepartmentTouched(false)
    setAi(null)
    setDuplicates([])
    setResult(null)
    setError(null)
  }

  // Step 1 -> 2: ask the AI for suggestions; fall back to manual entry.
  async function requestSuggestions(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    let response
    try {
      response = await api.post('/ai/classify', {
        title: details.title,
        description: details.description,
        building: details.building,
        room: details.room,
      })
    } catch (err) {
      if (err.status === 400) {
        setError(err.message)
        setBusy(false)
        return
      }
      response = { available: false, reason: err.message }
    }

    setAi(response)
    if (response.available) {
      const s = response.suggestion
      setClassification({ category_id: s.categoryId, department_id: s.departmentId, priority: s.priority })
      setDepartmentTouched(false)
    } else if (!classification.category_id) {
      setClassification(EMPTY_CLASS)
    }
    setBusy(false)
    setStep('classify')
  }

  function chooseCategory(value) {
    const categoryId = value ? Number(value) : ''
    setClassification((c) => ({
      ...c,
      category_id: categoryId,
      department_id: !departmentTouched && categoryId
        ? categoriesById.get(categoryId)?.default_department_id ?? c.department_id
        : c.department_id,
    }))
  }

  // Step 2 -> 3: look for likely duplicates before creating anything.
  async function checkDuplicates(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { duplicates: found } = await api.post('/issues/duplicates', {
        title: details.title,
        description: details.description,
        building: details.building,
        room: details.room,
        category_id: classification.category_id,
      })
      if (found.length > 0) {
        setDuplicates(found)
        setStep('duplicates')
      } else {
        await submitNew()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitNew() {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('title', details.title)
      form.set('description', details.description)
      form.set('building', details.building)
      form.set('room', details.room)
      form.set('note', details.note)
      form.set('category_id', String(classification.category_id))
      form.set('department_id', String(classification.department_id))
      form.set('priority', classification.priority)
      if (ai?.available && ai.token) form.set('ai_token', ai.token)
      if (image) form.set('image', image)

      const { id } = await api.post('/issues', form)
      setResult({ id, joined: false })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function joinExisting(issue) {
    const ok = window.confirm(
      `Add your report to "${issue.title}"?\n\nYou will be listed as another affected reporter (your identity is kept private from staff). No duplicate issue will be created.`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(`/issues/${issue.id}/join`, { note: details.description })
      setResult({ id: issue.id, joined: true, alreadyLinked: !res.joined })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (catalogError) return <div className="alert alert-error">{catalogError}</div>
  if (!catalog) return <div className="center-screen muted">Loading categories and departments…</div>

  const stepLabels = ['1. Problem Details', '2. Category & AI', '3. Duplicate Check', '4. Confirmation']
  const stepKeys = ['details', 'classify', 'duplicates', 'done']
  const currentStepIndex = stepKeys.indexOf(step)

  return (
    <div className="report-page-container">
      {/* Top Banner Notice for Emergency */}
      <div className="emergency-quick-bar">
        <IconEmergency />
        <span>
          Immediate safety risk, fire or electrical shock hazard? Call campus security directly at{' '}
          <Link to="/emergency"><strong>(555) 0199</strong></Link>.
        </span>
      </div>

      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">Student Reporting</span>
          <h1>Report Campus Problem</h1>
          <p className="muted">
            Report broken equipment, leaks, electrical faults or damaged furniture. AI assists with categorization.
          </p>
        </div>
      </div>

      {/* Modern Stepper */}
      <div className="stepper-card">
        {stepLabels.map((label, idx) => {
          const isDone = idx < currentStepIndex
          const isCurrent = idx === currentStepIndex
          return (
            <div
              key={label}
              className={`step-bubble ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
            >
              <span className="step-circle">{isDone ? '✓' : idx + 1}</span>
              <span className="step-name">{label}</span>
            </div>
          )
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* STEP 1: Details */}
      {step === 'details' && (
        <form className="card modern-form-card" onSubmit={requestSuggestions}>
          <div className="form-section-title">
            <span className="form-number-tag">Step 1</span>
            <h3>Describe the Physical Issue</h3>
          </div>

          <label className="field">
            <span className="field-label">Issue Title</span>
            <input
              className="styled-input"
              value={details.title}
              onChange={(e) => updateDetails('title', e.target.value)}
              placeholder="e.g. Water leaking from ceiling near lab entrance"
              required
              minLength={3}
              maxLength={150}
            />
          </label>

          <label className="field">
            <span className="field-label">Detailed Description</span>
            <textarea
              className="styled-textarea"
              value={details.description}
              onChange={(e) => updateDetails('description', e.target.value)}
              placeholder="What is broken? When did it start? Does it cause flooding, sparks, or block access?"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
            />
            <div className="char-count">{details.description.length} / 2000 characters</div>
          </label>

          <div className="row-two-col">
            <label className="field">
              <span className="field-label">Campus Building</span>
              <input
                className="styled-input"
                value={details.building}
                onChange={(e) => updateDetails('building', e.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Science Block B or Central Library"
              />
            </label>
            <label className="field">
              <span className="field-label">Room / Hallway <em className="muted">(Optional)</em></span>
              <input
                className="styled-input"
                value={details.room}
                onChange={(e) => updateDetails('room', e.target.value)}
                maxLength={50}
                placeholder="e.g. Room 204 or 2nd floor corridor"
              />
            </label>
          </div>

          <div className="photo-upload-section">
            <span className="field-label">Attach Photo <em className="muted">(Optional, max 5 MB)</em></span>
            <div className="photo-upload-box">
              <input
                type="file"
                id="photo-file"
                className="hidden-file-input"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <label htmlFor="photo-file" className="photo-upload-label">
                <IconCamera className="upload-icon" />
                <span>{image ? image.name : 'Click or drop a photo of the problem'}</span>
                <span className="upload-hint">Supports JPEG, PNG, or WebP</span>
              </label>
            </div>
            {imagePreview && (
              <div className="photo-preview-wrap">
                <img src={imagePreview} alt="Preview" className="photo-thumbnail" />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setImage(null)
                    setImagePreview(null)
                  }}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div className="form-actions-right">
            <button type="submit" className="btn btn-primary btn-submit-step" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-sm" /> Running AI Triage…
                </>
              ) : (
                <>
                  <IconSparkles /> Continue to AI Categorization <IconArrowRight />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Classification */}
      {step === 'classify' && (
        <form className="card modern-form-card" onSubmit={checkDuplicates}>
          <div className="form-section-title">
            <span className="form-number-tag">Step 2</span>
            <h3>Category & Department Review</h3>
          </div>

          {ai?.available ? (
            <div className="ai-suggestion-box">
              <div className="ai-badge-row">
                <span className="ai-pill">
                  <IconSparkles /> AI Classifier Suggestion
                </span>
              </div>
              <p className="ai-reason-text">{ai.suggestion.reason}</p>
              <span className="ai-sub-note">You can edit any of these suggestions below if needed.</span>
            </div>
          ) : (
            <div className="alert alert-warn">
              <strong>Manual Selection:</strong> {ai?.reason ?? 'AI suggestion service is offline. Please choose below.'}
            </div>
          )}

          <label className="field">
            <div className="field-label-with-tag">
              <span className="field-label">Problem Category</span>
              <AiTag ai={ai} field="categoryId" value={classification.category_id} />
            </div>
            <select
              className="styled-select"
              value={classification.category_id}
              onChange={(e) => chooseCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <div className="field-label-with-tag">
              <span className="field-label">Responsible Department</span>
              <AiTag ai={ai} field="departmentId" value={classification.department_id} />
            </div>
            <select
              className="styled-select"
              value={classification.department_id}
              onChange={(e) => {
                setDepartmentTouched(true)
                setClassification((c) => ({ ...c, department_id: e.target.value ? Number(e.target.value) : '' }))
              }}
              required
            >
              <option value="">Select a department</option>
              {catalog.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="field">
            <div className="field-label-with-tag">
              <legend className="field-label">Urgency & Priority</legend>
              <AiTag ai={ai} field="priority" value={classification.priority} />
            </div>
            <div className="segmented-grid">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  className={`segmented-chip ${classification.priority === value ? `selected priority-${value}` : ''}`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={value}
                    checked={classification.priority === value}
                    onChange={() => setClassification((c) => ({ ...c, priority: value }))}
                    required
                  />
                  <div className="chip-content">
                    <span className="chip-title">{label} Priority</span>
                    <span className="chip-desc">
                      {value === 'high'
                        ? 'Safety hazard / critical halt (24h SLA)'
                        : value === 'medium'
                          ? 'Equipment fault / disrupts work (72h SLA)'
                          : 'Minor wear & tear / cosmetic (7d SLA)'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-actions-between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep('details')}
              disabled={busy}
            >
              ← Back to Details
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-sm" /> Checking Duplicates…
                </>
              ) : (
                <>
                  Check Duplicates & Submit <IconArrowRight />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Duplicates */}
      {step === 'duplicates' && (
        <div className="card modern-form-card">
          <div className="form-section-title">
            <span className="form-number-tag">Step 3</span>
            <h3>Similar Campus Reports Found</h3>
          </div>
          <p className="muted">
            We discovered existing open reports in <strong>{details.building}</strong>. If one of these matches your
            problem, click <strong>"This is my problem"</strong> to boost its priority and join the updates. Your
            identity remains anonymous.
          </p>

          <ul className="dup-list">
            {duplicates.map((d) => (
              <li key={d.id} className="dup-item-card">
                <div className="dup-main">
                  <div className="dup-title">
                    <strong>{d.title}</strong> <StatusBadge status={d.status} />
                  </div>
                  <p className="dup-desc">{d.description}</p>
                  <p className="small muted">
                    {d.room ? `${d.building}, ${d.room}` : d.building} · {d.category_name} · Reported{' '}
                    {formatDateTime(d.created_at)} · {d.reporter_count}{' '}
                    {d.reporter_count === 1 ? 'student affected' : 'students affected'}
                  </p>
                </div>
                {d.already_joined ? (
                  <Link className="btn btn-ghost btn-sm" to={`/issues/${d.id}`}>
                    Already Joined
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => joinExisting(d)}
                    disabled={busy}
                  >
                    <IconUsers /> This is my problem (Join)
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="form-actions-between mt-lg">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep('classify')}
              disabled={busy}
            >
              ← Back to Category
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitNew}
              disabled={busy}
            >
              {busy ? 'Submitting…' : 'None of these — Submit as new issue'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && result && (
        <div className="card modern-form-card center-card-content">
          <div className="success-icon-wrap">
            <IconCheckCircle />
          </div>
          <h2>{result.joined ? 'Successfully Added to Report' : 'Issue Reported Successfully!'}</h2>
          <p className="muted">
            {result.alreadyLinked
              ? 'You are already registered as an affected student on this issue.'
              : result.joined
                ? 'The assigned department has been notified that another student is affected. You will receive status updates.'
                : 'The maintenance team has received your ticket and will begin diagnosis according to SLA guidelines.'}
          </p>
          <div className="actions center mt-lg">
            <Link className="btn btn-primary" to={`/issues/${result.id}`}>
              View Issue Status
            </Link>
            <button type="button" className="btn btn-ghost" onClick={resetAll}>
              Report Another Problem
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AiTag({ ai, field, value }) {
  if (!ai?.available) return null
  const suggested = ai.suggestion[field]
  return suggested === value ? (
    <span className="tag-ai-pill">
      <IconSparkles /> AI Suggested
    </span>
  ) : (
    <span className="tag-edited-pill">Edited by you</span>
  )
}
