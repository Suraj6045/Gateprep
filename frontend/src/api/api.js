import api from './client'

export const fetcher = url => api.get(url).then(res => res.data)

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:         ()              => api.get('/admin/users'),
  updateRole:       (id, role)      => api.patch(`/admin/users/${id}/role`, { role }),
  toggleStatus:     (id)            => api.patch(`/admin/users/${id}/status`),
  createPasswordReset: (id)         => api.post(`/admin/users/${id}/password-reset`),
  getTests:         ()              => api.get('/admin/tests'),
  getTest:          (id)            => api.get(`/admin/tests/${id}`),
  createTest:       (data)          => api.post('/admin/tests', data),
  deleteTest:       (id)            => api.delete(`/admin/tests/${id}`),
  updateTest:       (id, data)       => api.patch(`/admin/tests/${id}`, data),
  getQuestions:     (testId)        => api.get(`/admin/tests/${testId}/questions`),
  addQuestions:     (testId, qs)    => api.post(`/admin/tests/${testId}/questions`, { questions: qs }),
  updateQuestion:   (testId, qId, data) => api.patch(`/admin/tests/${testId}/questions/${qId}`, data),
  uploadQuestionsFile: (testId, form) => api.post(`/admin/tests/${testId}/questions/upload-file`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQuestion:   (testId, qId)   => api.delete(`/admin/tests/${testId}/questions/${qId}`),
  uploadQImage:     (qId, form, target = 'question') => api.post(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQImage:     (qId, target)   => api.delete(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`),
}

// ── Tests ─────────────────────────────────────────────────────────
export const testAPI = {
  getTests:           ()                        => api.get('/tests'),
  getTest:            (id)                      => api.get(`/tests/${id}`),
  startTest:          (id)                      => api.post(`/tests/${id}/start`),
  getQuestions:       (testId, attemptId)       => api.get(`/tests/${testId}/attempt/${attemptId}/questions`),
  saveAnswers:        (testId, attemptId, ans)  => api.post(`/tests/${testId}/attempt/${attemptId}/save`, { answers: ans }),
  submitTest:         (testId, attemptId, ans)  => api.post(`/tests/${testId}/attempt/${attemptId}/submit`, { answers: ans }),
  updateViolations:   (testId, attemptId, data) => api.patch(`/tests/${testId}/attempt/${attemptId}/violations`, data),
  getResult:          (attemptId)               => api.get(`/tests/attempt/${attemptId}/result`),
  getHistory:         ()                        => api.get('/tests/my/history'),
  getLeaderboard:     (testId)                  => api.get(`/tests/${testId}/leaderboard`),
  getMyAttempts:      (testId)                  => api.get(`/tests/${testId}/my-attempts`),
}

// ── Bookmarks ─────────────────────────────────────────────────────
export const bookmarkAPI = {
  toggle:     (questionId, note) => api.post(`/bookmarks/${questionId}/toggle`, { note }),
  getAll:     ()                 => api.get('/bookmarks'),
  getIds:     ()                 => api.get('/bookmarks/ids'),
  updateNote: (questionId, note) => api.patch(`/bookmarks/${questionId}/note`, { note }),
}

// ── Series ────────────────────────────────────────────────────────
export const seriesAPI = {
  getAll:   ()     => api.get('/series'),
  getTests: (id)   => api.get(`/series/${id}/tests`),
  create:   (data) => api.post('/series', data),
  delete:   (id)   => api.delete(`/series/${id}`),
}
