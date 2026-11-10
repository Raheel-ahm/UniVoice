import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// State machine transition verification
const VALID_TRANSITIONS = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
}

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

describe('Issue Status Lifecycle Workflow', () => {
  it('allows open -> in_progress transition', () => {
    assert.equal(isValidTransition('open', 'in_progress'), true)
  })

  it('allows open -> closed direct rejection/resolution with note', () => {
    assert.equal(isValidTransition('open', 'closed'), true)
  })

  it('allows in_progress -> resolved transition', () => {
    assert.equal(isValidTransition('in_progress', 'resolved'), true)
  })

  it('allows reopen resolved -> in_progress', () => {
    assert.equal(isValidTransition('resolved', 'in_progress'), true)
  })

  it('prevents illegal backward or arbitrary jumps', () => {
    assert.equal(isValidTransition('resolved', 'open'), false)
    assert.equal(isValidTransition('closed', 'open'), false)
    assert.equal(isValidTransition('closed', 'in_progress'), false)
  })
})
