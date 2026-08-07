import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildResultHtml, downloadResultReport } from './reportGenerator'

describe('reportGenerator', () => {
  describe('buildResultHtml', () => {
    it('generates correct HTML for a complete result object', () => {
      const mockResult = {
        test_title: 'Mock Test Title',
        attempt_number: 1,
        counts_for_leaderboard: true,
        submitted_at: '2026-06-23T12:00:00Z',
        score: 10.5,
        total_marks: 20,
        percentage: 52.5,
        correct: 5,
        incorrect: 2,
        skipped: 3,
        answers: [
          {
            is_correct: true,
            options: ['Option A', 'Option <B>'],
            marks_awarded: 2,
            question_text: 'What is 1+1?',
            selected_answer: 'A',
            correct_answer: 'A',
            time_spent_seconds: 45
          },
          {
            is_correct: null, // skipped
            options: [],
            marks_awarded: 0,
            question_text: 'NAT Question?',
            selected_answer: '',
            correct_answer: '42',
            time_spent_seconds: 10
          }
        ]
      }
      
      const html = buildResultHtml(mockResult)
      
      // Basic generation checks
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('<title>Mock Test Title result</title>')
      
      // Data and HTML escaping checks
      expect(html).toContain('Mock Test Title')
      expect(html).toContain('Option &lt;B&gt;') // Ensures escapeHtml works
      expect(html).toContain('Saved first attempt')
      expect(html).toContain('What is 1+1?')
      expect(html).toContain('NAT Question?')
      
      // Status text
      expect(html).toContain('Correct</span>')
      expect(html).toContain('Skipped</span>')
      
      // Default formatting checks
      expect(html).toContain('10.50 / 20')
      expect(html).toContain('53%') // Math.round(52.5)
    })
    
    it('handles empty results without crashing', () => {
      const emptyResult = {}
      const html = buildResultHtml(emptyResult)
      
      expect(html).toContain('Practice attempt')
      expect(html).toContain('NaN%') // It doesn't handle undefined percentage gracefully, but it shouldn't crash
    })
  })

  describe('downloadResultReport', () => {
    let createObjectURLSpy
    let revokeObjectURLSpy
    let createElementSpy
    let appendChildSpy

    beforeEach(() => {
      createObjectURLSpy = vi.fn(() => 'blob:mock-url')
      revokeObjectURLSpy = vi.fn()
      
      // jsdom might not have URL.createObjectURL implemented, so we overwrite it
      global.URL.createObjectURL = createObjectURLSpy
      global.URL.revokeObjectURL = revokeObjectURLSpy

      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('creates a blob, triggers download with correct filename, and cleans up', () => {
      // Mock element creation and methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      }
      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})

      const mockResult = {
        test_title: 'My Awesome Test! 2026',
        counts_for_leaderboard: false
      }

      downloadResultReport(mockResult)

      // Verify Blob and URL creation
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      const blobArg = createObjectURLSpy.mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('text/html;charset=utf-8')

      // Verify link manipulation
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('blob:mock-url')
      
      // Verify title slugification and suffix
      expect(mockLink.download).toBe('my-awesome-test-2026-practice-result.html')
      
      // Verify DOM interaction and trigger
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalledTimes(1)
      expect(mockLink.remove).toHaveBeenCalledTimes(1)

      // Verify async cleanup (setTimeout)
      vi.runAllTimers()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
