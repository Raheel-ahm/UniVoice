import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PRIORITY_LABELS } from '../lib/constants.js'
import { formatDateTime } from '../lib/format.js'
import { StatusBadge } from '../components/Badges.jsx'

const EMPTY_DETAILS = { title: '', description: '', building: '', room: '', note: '' }
const EMPTY_CLASS = { category_id: '', department_id: '', priority: '' }

export default function ReportIssue() {
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState(null)

  const [step, setStep] = useState('details') // details -> classify -> duplicates -> done
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [image, setImage] = useState(null)
  const [classification, setClassification] = useState(EMPTY_CLASS)
  const [departmentTouched, setDepartmentTouched] = useState(false)
  const [ai, setAi] = useState(null) // { available, suggestion?, token?, reason? }
  const [duplicates, setDuplicates] = useState([])
  const [result, setResult] = useState(null) // { id, joined }

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

  function resetAll() {
    setStep('details')
    setDetails(EMPTY_DETAILS)
    setImage(null)
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
      // Follow the category's default department until the student picks one.
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
      `Add your report to "${issue.title}"?\n\nYou will be listed as another affected reporter (your identity is not shown to staff). No new issue will be created.`,
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

  if (catalogError) return <p className="alert alert-error">{catalogError}</p>
  if (!catalog) return <p className="muted">Loading…</p>

  return (
    <div className="page narrow">
      <h1>Report a campus problem</h1>
      <p className="muted">
        For broken equipment, electrical faults, leaks and damaged infrastructure.
      </p>

      <ol className="stepper">
        {['Describe', 'Category & priority', 'Check duplicates', 'Done'].map((label, i) => {
          const index = ['details', 'classify', 'duplicates', 'done'].indexOf(step)
          return (
            <li key={label} className={i === index ? 'current' : i < index ? 'complete' : ''}>
              {label}
            </li>
          )
        })}
      </ol>

      {error && <p className="alert alert-error">{error}</p>}

      {step === 'details' && (
        <form className="card form" onSubmit={requestSuggestions}>
          <label className="field">
            <span>What's the problem?</span>
            <input
              value={details.title}
              onChange={(e) => updateDetails('title', e.target.value)}
              placeholder="e.g. Water leaking from ceiling near lab door"
              required
              minLength={3}
              maxLength={150}
            />
          </label>
          <label className="field">
            <span>Details</span>
            <textarea
              value={details.description}
              onChange={(e) => updateDetails('description', e.target.value)}
              placeholder="What did you see, when did it start, how bad is it?"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
            />
            <small className="muted">{details.description.length}/2000</small>
          </label>
          <div className="row">
            <label className="field">
              <span>Building</span>
              <input value={details.building} onChange={(e) => updateDetails('building', e.target.value)} required maxLength={100} placeholder="e.g. Science Block" />
            </label>
            <label className="field">
              <span>Room <em className="muted">(optional)</em></span>
              <input value={details.room} onChange={(e) => updateDetails('room', e.target.value)} maxLength={50} placeholder="e.g. S-204" />
            </label>
          </div>
          <label className="field">
            <span>Photo <em className="muted">(optional, JPEG/PNG/WebP, max 5 MB)</em></span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Analysing…' : 'Next: get suggestions'}
          </button>
        </form>
      )}

      {step === 'classify' && (
        <form className="card form" onSubmit={checkDuplicates}>
          {ai?.available ? (
            <div className="alert alert-info">
              <strong>AI suggestion.</strong> {ai.suggestion.reason} You can change any of these.
            </div>
          ) : (
            <div className="alert alert-warn">
              <strong>Choose manually.</strong> {ai?.reason ?? 'AI suggestions are unavailable.'}
            </div>
          )}

          <label className="field">
            <span>
              Category <AiTag ai={ai} field="categoryId" value={classification.category_id} />
            </span>
            <select value={classification.category_id} onChange={(e) => chooseCategory(e.target.value)} required>
              <option value="">Select a category</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              Responsible department <AiTag ai={ai} field="departmentId" value={classification.department_id} />
            </span>
            <select
              value={classification.department_id}
              onChange={(e) => {
                setDepartmentTouched(true)
                setClassification((c) => ({ ...c, department_id: e.target.value ? Number(e.target.value) : '' }))
              }}
              required
            >
              <option value="">Select a department</option>
              {catalog.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>

          <fieldset className="field">
            <legend>
              Priority <AiTag ai={ai} field="priority" value={classification.priority} />
            </legend>
            <div className="segmented">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <label key={value} className={classification.priority === value ? `selected priority-${value}` : ''}>
                  <input
                    type="radio"
                    name="priority"
                    value={value}
                    checked={classification.priority === value}
                    onChange={() => setClassification((c) => ({ ...c, priority: value }))}
                    required
                  />
                  {label}
                </label>
              ))}
            </div>
            <small className="muted">High: safety risk or major disruption. Medium: broken, affects work. Low: minor or cosmetic.</small>
          </fieldset>

          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('details')} disabled={busy}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Checking…' : 'Next'}
            </button>
          </div>
        </form>
      )}

      {step === 'duplicates' && (
        <div className="card">
          <h2>Is this already reported?</h2>
          <p className="muted">
            We found similar open reports in {details.building}. If one of them is your problem, add yourself to it.
            Nothing is merged unless you confirm.
          </p>

          <ul className="dup-list">
            {duplicates.map((d) => (
              <li key={d.id} className="dup-item">
                <div className="dup-main">
                  <div className="dup-title">
                    <strong>{d.title}</strong> <StatusBadge status={d.status} />
                  </div>
                  <p className="dup-desc">{d.description}</p>
                  <p className="small muted">
                    {d.room ? `${d.building}, ${d.room}` : d.building} · {d.category_name} · reported {formatDateTime(d.created_at)} ·{' '}
                    {d.reporter_count} {d.reporter_count === 1 ? 'reporter' : 'reporters'}
                  </p>
                </div>
                {d.already_joined ? (
                  <Link className="btn btn-ghost btn-sm" to={`/issues/${d.id}`}>You reported this</Link>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => joinExisting(d)} disabled={busy}>
                    This is my problem
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('classify')} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={submitNew} disabled={busy}>
              {busy ? 'Submitting…' : 'None of these, submit new report'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="card center">
          <h2>{result.joined ? 'Added to existing report' : 'Report submitted'}</h2>
          <p className="muted">
            {result.alreadyLinked
              ? 'You were already linked to this report.'
              : result.joined
                ? 'The department now knows another person is affected. You will see its progress in My reports.'
                : 'The responsible department has been notified. You can follow its progress in My reports.'}
          </p>
          <div className="actions center">
            <Link className="btn btn-secondary" to={`/issues/${result.id}`}>View report</Link>
            <button type="button" className="btn btn-ghost" onClick={resetAll}>Report another problem</button>
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
    <span className="tag tag-ai">AI suggested</span>
  ) : (
    <span className="tag tag-edited">Edited by you</span>
  )
}
