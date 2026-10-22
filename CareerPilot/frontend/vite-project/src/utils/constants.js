export const ROLES = [
  'Java Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
]

export const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

export const TYPES = [
  { value: 'TECHNICAL', label: 'Technical', hint: 'Role-specific technical questions' },
  { value: 'HR', label: 'HR', hint: 'Introduction, motivation and workplace questions' },
  { value: 'BEHAVIORAL', label: 'Behavioral', hint: 'Past-experience questions (STAR method)' },
  { value: 'MIXED', label: 'Mixed', hint: 'A realistic blend of all three' },
]

export const CATEGORIES = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'HR', label: 'HR' },
  { value: 'BEHAVIORAL', label: 'Behavioral' },
]

export const QUESTION_COUNTS = [3, 5, 8, 10, 15, 20]

export const TIME_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '1 minute 30 seconds' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
]

export const SPEECH_LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
]

export const EVALUATION_LABEL = 'Rule-based keyword scoring (not AI)'

export function labelOf(list, value) {
  const found = list.find((item) => item.value === value)
  return found ? found.label : value
}
