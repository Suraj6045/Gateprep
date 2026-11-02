import type { AxiosResponse } from 'axios'
import type { components } from '../api/schema'

export type ApiResponse<T> = AxiosResponse<T>
export type ApiJson = Record<string, unknown>
export type ApiId = number

export type TestStatus = components['schemas']['TestStatus']
// TODO(response_model): backend UserRole enum is defined in app/models/models.py.
export type AdminRole = 'admin' | 'aspirant' | 'user'

export type TestCatalogItem = components['schemas']['CatalogResponse']

// TODO(response_model): response shape for GET /admin/tests/{id}/questions.
export interface AdminQuestion extends TestQuestion {
  question_text: string
  options: string[]
  correct_answer: string
  marks: number
  negative_marks: number
  order_index: number
  subject: string | null
  topic: string | null
  option_images: Record<string, string | null> | null
}

export type TestDetail = components['schemas']['DetailResponse']

// TODO(response_model): fields consumed by admin user management.
export interface AdminUser {
  id: number
  email: string
  full_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
  pending_count: number
  aspirants_count: number
  has_more: boolean
  next_cursor: string | null
}

// TODO(response_model): fields consumed by admin password reset.
export interface PasswordResetResponse {
  user_id: number
  email: string
  full_name: string
  reset_url: string
  is_local_url: boolean
  expires_at: string
}

// TODO(response_model): response shape for GET /admin/tests.
export interface AdminTestListItem {
  id: number
  title: string
  description: string | null
  duration_minutes: number
  total_marks: number
  question_count: number
  series_id: number | null
  created_at: string
  category: string | null
  series_name: string | null
  test_type: string | null
  subject: string | null
  is_published: boolean
}

// TODO(response_model): response shape for POST /admin/tests.
export interface AdminTestCreateResponse {
  id: number
  title: string
  question_count: number
  total_marks: number
}

// TODO(response_model): response shape for POST /admin/tests/{id}/questions/upload-file.
export interface QuestionsUploadResponse {
  message?: string
  imported_count?: number
}

// TODO(response_model): response shape for GET /bookmarks/ids.
export interface BookmarkIdsResponse { ids: number[] }
// TODO(response_model): response shape for POST /bookmarks/{id}/toggle.
export interface BookmarkToggleResponse { bookmarked: boolean }

// TODO(response_model): option_images typed as string|null per app write paths (admin/questions.py upload/delete/NAT clear); backend BookmarkOut types it as Optional[dict]; replace with generated BookmarkOut once backend types option_images.
export interface BookmarkItem {
  correct_answer?: string | null
  created_at: string
  id: number
  marks: number
  note: string | null
  option_images?: Record<string, string | null> | null
  options: string[]
  question_id: number
  question_image_url?: string | null
  question_text: string
  question_type: string
  subject: string | null
  test_id: number
  test_title: string
  topic: string | null
}

// TODO(response_model): fields consumed by admin test editing.
export type AdminTestQuestion = AdminQuestion

export interface AdminTestResponse {
  id: number
  title: string
  description: string | null
  duration_minutes: number
  total_marks: number
  question_count: number
  series_id: number | null
  created_at: string
  questions?: AdminTestQuestion[]
}

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type AuthUserResponse = components['schemas']['AuthUserResponse']
export type RoleUpdate = components['schemas']['RoleUpdate']
// Pydantic lax mode (schemas.py:15-24, int = Field(180, gt=0)) coerces numeric strings; the create form sends the input value (number default, string after editing, '' when cleared -> 422)
export type TestCreate = Omit<components['schemas']['TestCreate'], 'series_order' | 'duration_minutes'> & {
  series_order?: number
  duration_minutes: number | string
}
export type TestPatch = components['schemas']['TestPatch']
export type QuestionIn = Omit<
  components['schemas']['QuestionIn'],
  'question_type' | 'options' | 'marks' | 'negative_marks'
> & {
  question_type?: string
  options?: string[]
  marks?: number
  negative_marks?: number
}
export interface QuestionsBulk {
  questions: QuestionIn[]
}
export type SeriesCreate = components['schemas']['SeriesCreate']
export type BookmarkNote = components['schemas']['BookmarkNote']
export type AnswerSubmit = components['schemas']['AnswerSubmit']
export type ViolationUpdate = components['schemas']['ViolationUpdate']

export type AttemptAnswer = components['schemas']['AttemptAnswerResponse']
export type AttemptStart = components['schemas']['AttemptStartResponse']
export type TestQuestion = components['schemas']['TestQuestionResponse']
export type SaveAnswersResponse = components['schemas']['MessageResponse']
export type ViolationUpdateResponse = components['schemas']['MessageResponse']

export interface ResultAnswer {
  question_id?: number
  question_type?: 'mcq' | 'msq' | 'nat'
  question_image_url?: string | null
  option_images?: Record<string, unknown> | null
  marks?: number
  negative_marks?: number
  topper_answer?: string | null
  topper_time_seconds?: number
  is_correct?: boolean | null
  options?: unknown[] | Record<string, unknown>
  marks_awarded?: number
  question_text?: string
  selected_answer?: string | null
  correct_answer?: string
  time_spent_seconds?: number
}

export type PersistedResultAnswer = components['schemas']['ResultAnswerResponse']

export type ResultTopper = components['schemas']['ResultTopperResponse']

export interface ResultData {
  test_title?: string
  attempt_number?: unknown
  submitted_at?: string | null
  score?: number
  total_marks?: unknown
  percentage?: number
  correct?: unknown
  incorrect?: unknown
  skipped?: unknown
  attempt_id?: number | string | null
  client_result_id?: string | null
  answers?: ResultAnswer[]
}

export type PersistedResult = components['schemas']['PersistedResultResponse']

// FastAPI's OpenAPI literal schema is emitted as "True"/"False"; runtime JSON
// uses boolean values, so preserve the wire type while retaining generated fields.
export type SubmittedAttempt = Omit<
  components['schemas']['PersistedSubmitResponse'],
  'persisted'
> & { persisted: true }

export type PracticeResult = Omit<
  components['schemas']['PracticeSubmitResponse'],
  'persisted'
> & { persisted: false }

export type SubmitResult = SubmittedAttempt | PracticeResult

export type HistoryItem = components['schemas']['HistoryResponse']

export type MyAttempt = components['schemas']['MyAttemptResponse']

export type LeaderboardEntry = components['schemas']['LeaderboardEntryResponse']

export type LeaderboardResponse = components['schemas']['LeaderboardResponse']

// TODO(response_model): response shape for GET /auth/me.
export interface MeResponse {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  profile_photo: string | null
  created_at: string
}

// TODO(response_model): response shape for logout and reset-password.
export interface MessageResponse {
  message: string
}
// TODO(response_model): add response models for admin routes.
export type AdminResponse = unknown
// TODO(response_model): add response models for bookmark routes.
export type BookmarkResponse = unknown
// TODO(response_model): add response models for series routes.
export type SeriesResponse = unknown
