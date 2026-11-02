import { testAPI } from '../api/api'
import type { ResultData } from '../types/api'
import katexCss from 'katex/dist/katex.min.css?raw'
import katexJs from 'katex/dist/katex.min.js?raw'
import katexAutoRenderJs from 'katex/dist/contrib/auto-render.min.js?raw'

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return String(value ?? '').replace(/[&<>"']/g, ch => entities[ch] ?? ch)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN')
}

export function buildResultHtml(result: ResultData): string {
  const rows = (result.answers || []).map((answer, idx) => {
    const status = answer.is_correct === true ? 'Correct' : answer.is_correct === false ? 'Wrong' : 'Skipped'
    // @ts-expect-error TODO(null-safety): options may be a dict; keep the existing array-only report generation path.
    const options = (answer.options || []).map((option: unknown, i: number) => {
      const letter = 'ABCD'[i] || `${i + 1}`
      return `<li><strong>${letter}.</strong> ${escapeHtml(option)}</li>`
    }).join('')

    return `
      <section class="question">
        <div class="q-head">
          <strong>Q${idx + 1}</strong>
          <span class="${status.toLowerCase()}">${status}</span>
          <span>${escapeHtml(answer.marks_awarded)} marks</span>
        </div>
        <p>${escapeHtml(answer.question_text)}</p>
        ${options ? `<ol>${options}</ol>` : ''}
        <div class="answers">
          <span>Your answer: <strong>${escapeHtml(answer.selected_answer || 'Skipped')}</strong></span>
          <span>Correct answer: <strong>${escapeHtml(answer.correct_answer)}</strong></span>
          <span>Time: <strong>${escapeHtml(answer.time_spent_seconds)}s</strong></span>
        </div>
      </section>`
  }).join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.test_title)} result</title>
  <style>${katexCss}</style>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; line-height: 1.45; }
    header { border-bottom: 1px solid #d1d5db; margin-bottom: 20px; padding-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; }
    .metric { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .metric strong { display: block; font-size: 20px; }
    .question { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin: 12px 0; break-inside: avoid; }
    .q-head, .answers { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .q-head { justify-content: space-between; margin-bottom: 8px; }
    .correct { color: #15803d; }
    .wrong { color: #b91c1c; }
    .skipped { color: #64748b; }
    ol { margin: 8px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(result.test_title)}</h1>
    <div>Attempt ${escapeHtml(result.attempt_number)} · Practice attempt · ${escapeHtml(formatDate(result.submitted_at))}</div>
    <div class="summary">
      <div class="metric"><span>Score</span><strong>${escapeHtml(result.score?.toFixed?.(2) ?? result.score)} / ${escapeHtml(result.total_marks)}</strong></div>
      <div class="metric"><span>Percentage</span><strong>${escapeHtml(Math.round(Number(result.percentage)))}%</strong></div>
      <div class="metric"><span>Correct</span><strong>${escapeHtml(result.correct)}</strong></div>
      <div class="metric"><span>Wrong</span><strong>${escapeHtml(result.incorrect)}</strong></div>
      <div class="metric"><span>Skipped</span><strong>${escapeHtml(result.skipped)}</strong></div>
    </div>
  </header>
  ${rows}
  <script>${katexJs}</script>
  <script>${katexAutoRenderJs}</script>
  <script>
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\\\[', right: '\\\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\\\(', right: '\\\\)', display: false }
      ],
      throwOnError: false
    })
  </script>
</body>
</html>`
}

export function downloadPracticeResultHtml(result: ResultData): void {
  const slug = (result.test_title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = 'practice-result'
  const blob = new Blob([buildResultHtml(result)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slug || 'test'}-${suffix}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function downloadResultReport(result: ResultData | null | undefined): Promise<void> {
  if (!result || result.attempt_id == null || String(result.attempt_id).startsWith('practice-')) {
    return downloadPracticeResultHtml(result || {})
  }
  const res = await testAPI.downloadResultHtml(result.attempt_id)
  const slug = (result.test_title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = 'result'
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slug || 'test'}-${suffix}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
