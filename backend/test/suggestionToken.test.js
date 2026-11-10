import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSuggestionToken, readSuggestionToken } from '../src/lib/suggestionToken.js'

describe('Cryptographic AI Suggestion Token', () => {
  const userId = '11111111-2222-3333-4444-555555555555'
  const suggestion = {
    categoryId: 'c-1',
    departmentId: 'd-1',
    priority: 'high',
  }

  it('generates a valid signed suggestion token and verifies it', () => {
    const token = createSuggestionToken(userId, suggestion)
    assert.ok(typeof token === 'string')
    assert.ok(token.includes('.'))

    const decoded = readSuggestionToken(token, userId)
    assert.ok(decoded)
    assert.equal(decoded.categoryId, 'c-1')
    assert.equal(decoded.departmentId, 'd-1')
    assert.equal(decoded.priority, 'high')
  })

  it('rejects a token if decoded by a different user', () => {
    const token = createSuggestionToken(userId, suggestion)
    const differentUser = '99999999-8888-7777-6666-555555555555'
    const result = readSuggestionToken(token, differentUser)
    assert.equal(result, null)
  })

  it('rejects a tampered signature', () => {
    const token = createSuggestionToken(userId, suggestion)
    const [payload] = token.split('.')
    const forgedToken = `${payload}.forged_signature_here`
    const result = readSuggestionToken(forgedToken, userId)
    assert.equal(result, null)
  })

  it('rejects a malformed token or null input', () => {
    assert.equal(readSuggestionToken(null, userId), null)
    assert.equal(readSuggestionToken('', userId), null)
    assert.equal(readSuggestionToken('invalid-token-no-dots', userId), null)
  })
})
