// Records exist only in React memory for the current session. Nothing is saved,
// sent to a server, or stored in the browser between visits.

export function createQuestionRecord(active, number, attempts = [], solutionViewed = false, skipped = false) {
  const { template, values } = active;
  return {
    number,
    id: template.id,
    unit: template.unit,
    question: template.statement(values),
    attempts: attempts.map(({ value, correct }) => ({
      value: String(value),
      correct: Boolean(correct),
      // Use the displayed multiple-choice text, not an internal option ID.
      display: template.type === 'multiple-choice'
        ? template.choices.find((choice) => choice.id === value)?.text ?? String(value)
        : `${value}${template.answerUnit ? ` ${template.answerUnit}` : ''}`,
    })),
    solutionViewed: Boolean(solutionViewed),
    skipped: Boolean(skipped),
  };
}

export function getQuestionOutcome(record) {
  if (record.skipped) return 'skipped';
  if (record.attempts.some((attempt) => attempt.correct)) return 'correct';
  if (record.attempts.length) return 'incorrect';
  return 'unanswered';
}

export function countOutcomes(records) {
  const totals = { correct: 0, incorrect: 0, unanswered: 0 };
  records.forEach((record) => {
    const key = getQuestionOutcome(record);
    if (key in totals) totals[key] += 1;
  });
  return totals;
}

// Answer attempts are counted separately from the final outcome of a problem.
// A student can therefore have a correct problem outcome after an earlier
// incorrect attempt, without that earlier attempt disappearing from the report.
export function countAttempts(records) {
  return records.reduce((totals, record) => {
    for (const attempt of record.attempts) {
      totals[attempt.correct ? 'correct' : 'incorrect'] += 1;
    }
    return totals;
  }, { correct: 0, incorrect: 0 });
}
