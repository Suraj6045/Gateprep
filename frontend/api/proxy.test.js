import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTargetUrl } from './proxy.js'

const BACKEND = 'https://real-backend.hf.space'

/**
 * Build a minimal mock request object that mirrors what Vercel passes to
 * serverless handlers — just enough for buildTargetUrl to work.
 */
function fakeReq(path) {
  return { url: `/api/proxy?path=${encodeURIComponent(path)}` }
}

beforeAll(() => {
  process.env.API_PROXY_TARGET = BACKEND
})

afterAll(() => {
  delete process.env.API_PROXY_TARGET
})

// ── Payloads that MUST be allowed (legitimate routes) ────────────

describe('buildTargetUrl — allowed paths', () => {
  const allowed = [
    ['auth/login', `${BACKEND}/auth/login`],
    ['tests/5/results', `${BACKEND}/tests/5/results`],
    // double-slash is treated as a same-origin relative path
    ['//attacker.example.com/steal', `${BACKEND}/attacker.example.com/steal`],
    // bare hostname without scheme is a normal path segment
    ['evil.com/steal', `${BACKEND}/evil.com/steal`],
    // hostname with userinfo-style @ is just a path segment
    ['real-backend.hf.space@attacker.example.com/steal', `${BACKEND}/real-backend.hf.space@attacker.example.com/steal`],
    // ISO timestamp with colon should not false-positive
    ['2026-07-15T10:00:00/results', `${BACKEND}/2026-07-15T10:00:00/results`],
  ]

  it.each(allowed)('allows "%s" → %s', (path, expectedHref) => {
    const target = buildTargetUrl(fakeReq(path))
    expect(target.href).toBe(expectedHref)
  })
})

// ── Payloads that MUST be blocked (SSRF attempts) ────────────────

describe('buildTargetUrl — blocked paths', () => {
  const blocked = [
    'http://attacker.example.com/steal',
    'HTTP://attacker.example.com/steal',
    'https://attacker.example.com/steal',
    'javascript:alert(1)',
    'data:text/html,evil',
    'ftp://attacker.example.com/exfil',
    // double backslash — WHATWG URL parser treats \\ as // for special
    // schemes, so this resolves as a network-path reference with
    // attacker.example.com as the host. Layer 1 (regex) does not catch
    // this; layer 2 (origin check) does.
    '\\\\attacker.example.com/steal',
    // null-byte / control-character smuggling attempts
    'ht\ttp://attacker.example.com/steal',
  ]

  it.each(blocked)('blocks "%s"', (path) => {
    expect(() => buildTargetUrl(fakeReq(path))).toThrow('Invalid proxy path')
  })
})

// ── Edge cases ───────────────────────────────────────────────────

describe('buildTargetUrl — edge cases', () => {
  it('rejects when API_PROXY_TARGET is not set', () => {
    const saved = process.env.API_PROXY_TARGET
    delete process.env.API_PROXY_TARGET
    delete process.env.BACKEND_URL
    try {
      expect(() => buildTargetUrl(fakeReq('auth/login'))).toThrow(
        'API_PROXY_TARGET is not configured',
      )
    } finally {
      process.env.API_PROXY_TARGET = saved
    }
  })

  it('passes through extra query params', () => {
    const req = { url: '/api/proxy?path=tests&page=2&limit=10' }
    const target = buildTargetUrl(req)
    expect(target.searchParams.get('page')).toBe('2')
    expect(target.searchParams.get('limit')).toBe('10')
  })

  it('handles empty path gracefully', () => {
    const target = buildTargetUrl(fakeReq(''))
    expect(target.origin).toBe(new URL(BACKEND).origin)
  })
})
