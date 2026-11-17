// Session-only helpers. Problem physics stays in src/problems/.
export const GUIDANCE_LEVELS = [
  { id: 'guided', label: 'Guided' },
  { id: 'moderate', label: 'Some guidance' },
  { id: 'independent', label: 'Independent' },
];

export const FIXED_COUNTS = [3, 5, 10];

// Splits a fixed session into roughly equal thirds, progressing from guided
// to moderate to independent. Examples:
//   3 questions: guided, moderate, independent
//   5 questions: guided, guided, moderate, moderate, independent
export function guidanceForQuestion(session, questionIndex) {
  if (session.guidanceMode !== 'fade' || session.mode !== 'fixed') {
    return session.guidance;
  }
  const level = Math.min(2, Math.floor((questionIndex * 3) / session.count));
  return GUIDANCE_LEVELS[level].id;
}

export function hasValidSubmission(problem, submission) {
  if (problem.type === 'multiple-choice') return Boolean(submission);
  return submission.trim() !== '' && Number.isFinite(Number(submission));
}

export function isFinalQuestion(session, questionIndex) {
  return session.mode === 'fixed' && questionIndex + 1 >= session.count;
}
