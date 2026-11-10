import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TECHNICIANS } from '../src/services/assignments.js'

describe('Technician Assignments Service', () => {
  it('contains registered duty technicians with zones and radios', () => {
    assert.ok(Array.isArray(TECHNICIANS))
    assert.ok(TECHNICIANS.length >= 5)

    const first = TECHNICIANS[0]
    assert.ok(first.id)
    assert.ok(first.name)
    assert.ok(first.department)
    assert.ok(first.zone)
    assert.ok(first.radio)
  })

  it('includes specialists across different departments', () => {
    const departments = new Set(TECHNICIANS.map((t) => t.department))
    assert.ok(departments.has('Electrical'))
    assert.ok(departments.has('HVAC'))
    assert.ok(departments.has('Plumbing'))
  })
})

