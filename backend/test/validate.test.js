import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse, issueText, priority, status } from '../src/lib/validate.js'

describe('Validation Library', () => {
  it('validates a correct issue title', () => {
    const valid = parse(issueText.title, 'Broken projector in Lab 2')
    assert.equal(valid, 'Broken projector in Lab 2')
  })

  it('rejects an issue title that is too short', () => {
    assert.throws(
      () => parse(issueText.title, 'No'),
      /must be at least 3 characters/
    )
  })

  it('validates description with required minimum length', () => {
    const valid = parse(issueText.description, 'The projector lamp exploded during lecture and power tripped.')
    assert.equal(typeof valid, 'string')
    assert.ok(valid.length >= 10)
  })

  it('rejects description that is under 10 characters', () => {
    assert.throws(
      () => parse(issueText.description, 'Broken!'),
      /must be at least 10 characters/
    )
  })

  it('requires a building name', () => {
    const valid = parse(issueText.building, 'Engineering Complex')
    assert.equal(valid, 'Engineering Complex')
    assert.throws(() => parse(issueText.building, '   '), /is required/)
  })

  it('enforces allowed priorities', () => {
    assert.equal(parse(priority, 'low'), 'low')
    assert.equal(parse(priority, 'medium'), 'medium')
    assert.equal(parse(priority, 'high'), 'high')
    assert.throws(() => parse(priority, 'urgent'))
  })

  it('enforces workflow status values', () => {
    assert.equal(parse(status, 'open'), 'open')
    assert.equal(parse(status, 'in_progress'), 'in_progress')
    assert.equal(parse(status, 'resolved'), 'resolved')
    assert.equal(parse(status, 'closed'), 'closed')
    assert.throws(() => parse(status, 'cancelled'))
  })
})
