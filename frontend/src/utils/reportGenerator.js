function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN')
}

export function buildResultHtml(result) {
  const rows = (result.answers || []).map((answer, idx) => {
    const status = answer.is_correct === true ? 'Correct' : answer.is_correct === false ? 'Wrong' : 'Skipped'
    const options = (answer.options || []).map((option, i) => {
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
    <div>Attempt ${escapeHtml(result.attempt_number)} · ${result.counts_for_leaderboard ? 'Saved first attempt' : 'Practice attempt'} · ${escapeHtml(formatDate(result.submitted_at))}</div>
    <div class="summary">
      <div class="metric"><span>Score</span><strong>${escapeHtml(result.score?.toFixed?.(2) ?? result.score)} / ${escapeHtml(result.total_marks)}</strong></div>
      <div class="metric"><span>Percentage</span><strong>${escapeHtml(Math.round(result.percentage))}%</strong></div>
      <div class="metric"><span>Correct</span><strong>${escapeHtml(result.correct)}</strong></div>
      <div class="metric"><span>Wrong</span><strong>${escapeHtml(result.incorrect)}</strong></div>
      <div class="metric"><span>Skipped</span><strong>${escapeHtml(result.skipped)}</strong></div>
    </div>
  </header>
  ${rows}
</body>
</html>`
}

export function downloadResultReport(result) {
  const slug = (result.test_title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = result.counts_for_leaderboard ? 'result' : 'practice-result'
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
