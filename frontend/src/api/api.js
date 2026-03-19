import api from './client'

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  // Register (2-step with OTP)
  registerSendOTP:    (data)          => api.post('/auth/register/send-otp', data),
  registerVerify:     (data)          => api.post('/auth/register/verify-otp', data),
  registerResendOTP:  (email)         => api.post('/auth/register/resend-otp', { email }),

  // Login (direct — no OTP)
  login:              (data)          => api.post('/auth/login', data),

  me:                 ()              => api.get('/auth/me'),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:         ()              => api.get('/admin/users'),
  updateRole:       (id, role)      => api.patch(`/admin/users/${id}/role`, { role }),
  toggleStatus:     (id)            => api.patch(`/admin/users/${id}/status`),
  getTests:         ()              => api.get('/admin/tests'),
  getTest:          (id)            => api.get(`/admin/tests/${id}`),
  createTest:       (form)          => api.post('/admin/tests', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteTest:       (id)            => api.delete(`/admin/tests/${id}`),
  updateTest:       (id, data)       => api.patch(`/admin/tests/${id}`, data),
  getQuestions:     (testId)        => api.get(`/admin/tests/${testId}/questions`),
  addQuestions:     (testId, qs)    => api.post(`/admin/tests/${testId}/questions`, { questions: qs }),
  deleteQuestion:   (testId, qId)   => api.delete(`/admin/tests/${testId}/questions/${qId}`),
  uploadQImage:     (qId, form)     => api.post(`/admin/questions/${qId}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQImage:     (qId, target)   => api.delete(`/admin/questions/${qId}/image?target=${target}`),
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

// ── Checklist ─────────────────────────────────────────────────────
export const checklistAPI = {
  get:            ()                          => api.get('/checklist'),
  updateProgress: (topicId, item, completed)  => api.post(`/checklist/${topicId}/progress`, { item, completed }),
  createSubject:  (data)                      => api.post('/checklist/subjects', data),
  deleteSubject:  (id)                        => api.delete(`/checklist/subjects/${id}`),
  createTopic:    (subjectId, data)           => api.post(`/checklist/subjects/${subjectId}/topics`, data),
  deleteTopic:    (id)                        => api.delete(`/checklist/topics/${id}`),
}
