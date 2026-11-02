import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildResultHtml, downloadResultReport, downloadPracticeResultHtml } from './reportGenerator'
import { testAPI } from '../api/api'

vi.mock('../api/api', () => ({
  testAPI: {
    downloadResultHtml: vi.fn(),
  },
}))

describe('reportGenerator', () => {
  describe('buildResultHtml', () => {
    it('generates correct HTML for a practice result object', () => {
      const mockResult = {
        test_title: 'Mock Test Title',
        attempt_number: 1,
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
            time_spent_seconds: 45,
          },
          {
            is_correct: null, // skipped
            options: [],
            marks_awarded: 0,
            question_text: 'NAT Question?',
            selected_answer: '',
            correct_answer: '42',
            time_spent_seconds: 10,
          },
        ],
      }

      const html = buildResultHtml(mockResult)

      // Basic generation checks
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('<title>Mock Test Title result</title>')

      // Data and HTML escaping checks
      expect(html).toContain('Mock Test Title')
      expect(html).toContain('Option &lt;B&gt;') // Ensures escapeHtml works
      expect(html).toContain('Practice attempt')
      expect(html).toContain('What is 1+1?')
      expect(html).toContain('NAT Question?')
      expect(html).toContain('.katex')
      expect(html).toContain('renderMathInElement')

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
      expect(html).toContain('NaN%')
    })
  })

  describe('downloadResultReport', () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn<(object: Blob | MediaSource) => string>>
    let revokeObjectURLSpy: ReturnType<typeof vi.fn<(url: string) => void>>
    let createElementSpy: ReturnType<typeof vi.spyOn>
    let appendChildSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      createObjectURLSpy = vi.fn<(object: Blob | MediaSource) => string>(() => 'blob:mock-url')
      revokeObjectURLSpy = vi.fn<(url: string) => void>()

      window.URL.createObjectURL = createObjectURLSpy
      window.URL.revokeObjectURL = revokeObjectURLSpy

      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('falls back to client-side practice report when attempt_id is missing', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      }
      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(node => node)

      const mockResult = {
        test_title: 'Practice Test 101',
      }

      await downloadResultReport(mockResult)

      expect(testAPI.downloadResultHtml).not.toHaveBeenCalled()
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('text/html;charset=utf-8')

      expect(mockLink.download).toBe('practice-test-101-practice-result.html')
      expect(mockLink.click).toHaveBeenCalledTimes(1)

      vi.runAllTimers()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('downloads server-rendered HTML for persisted attempt_id', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      }
      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(node => node)

      const mockBlob = new Blob(['<!DOCTYPE html><html><body>Server Rendered Report</body></html>'], { type: 'text/html' })
      vi.mocked(testAPI.downloadResultHtml).mockResolvedValueOnce({
        data: mockBlob,
      } as Awaited<ReturnType<typeof testAPI.downloadResultHtml>>)

      const mockResult = {
        attempt_id: 42,
        test_title: 'GATE CS Mock 2026',
      }

      await downloadResultReport(mockResult)

      expect(testAPI.downloadResultHtml).toHaveBeenCalledWith(42)
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('text/html')

      expect(mockLink.download).toBe('gate-cs-mock-2026-result.html')
      expect(mockLink.click).toHaveBeenCalledTimes(1)

      vi.runAllTimers()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
