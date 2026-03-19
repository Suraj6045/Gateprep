// src/utils/constants.js
// Shared constants for test categories, subjects, series names

export const SUBJECTS = [
  'Engineering Mathematics',
  'Discrete Mathematics',
  'Digital Logic',
  'Computer Organization & Architecture',
  'Programming & Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Operating Systems',
  'Databases',
  'Computer Networks',
  'General Aptitude',
]

export const SERIES_NAMES = [
  { value: 'made_easy', label: 'Made Easy' },
  { value: 'go_classes', label: 'GO Classes' },
]

export const TEST_TYPES = [
  { value: 'subject_wise', label: 'Subject Wise' },
  { value: 'topic_wise',   label: 'Topic Wise' },
  { value: 'full_length',  label: 'Full Length' },
]

export const CATEGORIES = [
  { value: 'weekly_quiz', label: 'Weekly Quiz' },
  { value: 'test_series', label: 'Test Series' },
]

export const SERIES_LABELS = {
  made_easy:  'Made Easy',
  go_classes: 'GO Classes',
}

export const TYPE_LABELS = {
  subject_wise: 'Subject Wise',
  topic_wise:   'Topic Wise',
  full_length:  'Full Length',
}
