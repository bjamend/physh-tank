// Shared application logic. New physics problems belong in src/problems/, not here.

export const NUMERIC_RELATIVE_TOLERANCE = 0.01; // 1% for all numeric problems

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A topic is identified by BOTH its unit and its topic label. This avoids
// accidental collisions when two units use the same topic name.
export function topicKey(unit, topic) {
  return JSON.stringify([unit, topic]);
}

export function buildTopicCatalog(templates) {
  const groups = new Map();
  for (const template of templates) {
    for (const [unit, topics] of Object.entries(template.topicsByUnit)) {
      if (!groups.has(unit)) groups.set(unit, new Set());
      topics.forEach((topic) => groups.get(unit).add(topic));
    }
  }
  // Keep units in a predictable course-oriented order as the bank expands.
  const preferredOrder = [
    'Vectors', 'Kinematics', 'Dynamics', 'Energy', 'Momentum', 'Rotations',
    'Gravitation', 'Oscillations', 'Waves', 'Fluids', 'Thermodynamics',
  ];
  return [...groups.entries()]
    .map(([unit, topics]) => ({ unit, topics: [...topics].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => {
      const ai = preferredOrder.indexOf(a.unit);
      const bi = preferredOrder.indexOf(b.unit);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.unit.localeCompare(b.unit);
    });
}

// Inclusive matching: a cross-listed template is eligible when ANY of its
// unit/topic pairs is selected. The result contains each template only once.
export function filterProblemsByTopics(templates, selectedKeys) {
  const selected = new Set(selectedKeys);
  return templates.filter((template) =>
    Object.entries(template.topicsByUnit).some(([unit, topics]) =>
      topics.some((topic) => selected.has(topicKey(unit, topic)))
    )
  );
}

// Uses every registered template before repeating one. Also avoids an
// identical template twice in a row when a new cycle starts.
export function createProblemPicker(templates, initialId) {
  if (!templates.length) throw new Error('The problem bank cannot be empty.');
  let lastId = initialId;
  let remaining = shuffled(templates.filter((item) => item.id !== initialId));

  return {
    next() {
      if (templates.length === 1) return templates[0];
      if (!remaining.length) {
        remaining = shuffled(templates);
        if (remaining[0].id === lastId) {
          const swapIndex = remaining.findIndex((item) => item.id !== lastId);
          [remaining[0], remaining[swapIndex]] = [remaining[swapIndex], remaining[0]];
        }
      }
      const template = remaining.shift();
      lastId = template.id;
      return template;
    },
  };
}

export function checkResponse(template, values, submission) {
  if (template.type === 'multiple-choice') {
    if (!submission) return { correct: false, message: 'Choose an answer first.' };
    const correct = submission === values.answer;
    return {
      correct,
      message: correct ? 'Correct!' : 'Not quite. Try again, or use a hint.',
    };
  }

  if (submission.trim() === '' || !Number.isFinite(Number(submission))) {
    return { correct: false, message: 'Enter a numerical answer first.' };
  }
  const submitted = Number(submission);
  const tolerance = Math.max(
    template.absoluteTolerance ?? 0,
    NUMERIC_RELATIVE_TOLERANCE * Math.abs(values.answer),
  );
  const correct = Math.abs(submitted - values.answer) <= tolerance;
  return {
    correct,
    message: correct
      ? 'Correct!'
      : 'Not quite. Check your work, or use a hint and try again.',
  };
}

export function displayAnswer(template, values) {
  if (template.type === 'multiple-choice') {
    return template.choices.find((option) => option.id === values.answer)?.text ?? 'Unknown answer';
  }
  const decimals = template.answerDecimals ?? 2;
  return `${values.answer.toFixed(decimals)} ${template.answerUnit ?? ''}`.trim();
}

// Catch a few common authoring errors as soon as the app starts.
export function validateProblemBank(templates) {
  const seen = new Set();
  for (const item of templates) {
    if (!item.id || seen.has(item.id)) throw new Error(`Missing or duplicate problem ID: ${item.id}`);
    seen.add(item.id);
    if (!item.topicsByUnit || typeof item.topicsByUnit !== 'object' || Array.isArray(item.topicsByUnit)) {
      throw new Error(`Problem ${item.id} needs a topicsByUnit object.`);
    }
    const topicGroups = Object.entries(item.topicsByUnit);
    if (!topicGroups.length || !topicGroups.some(([unit]) => unit === item.unit)) {
      throw new Error(`Problem ${item.id} must list its primary unit under topicsByUnit.`);
    }
    for (const [unit, topics] of topicGroups) {
      if (!unit.trim() || !Array.isArray(topics) || !topics.length ||
          topics.some((topic) => typeof topic !== 'string' || !topic.trim())) {
        throw new Error(`Problem ${item.id} has invalid topic labels for unit ${unit}.`);
      }
    }
    if (!['numeric', 'multiple-choice'].includes(item.type)) {
      throw new Error(`Problem ${item.id} needs type: 'numeric' or 'multiple-choice'.`);
    }
    if (typeof item.generate !== 'function' || typeof item.statement !== 'function') {
      throw new Error(`Problem ${item.id} needs generate() and statement().`);
    }
    if (!item.scaffolding?.guided?.steps || typeof item.scaffolding?.moderate?.text !== 'string') {
      throw new Error(`Problem ${item.id} needs guided and moderate scaffolding.`);
    }
    if (!Array.isArray(item.equationHints) || !Array.isArray(item.symbolicSolution)) {
      throw new Error(`Problem ${item.id} needs equationHints and symbolicSolution arrays.`);
    }
    if (item.type === 'multiple-choice' && !Array.isArray(item.choices)) {
      throw new Error(`Problem ${item.id} needs a choices array.`);
    }
    const sample = item.generate();
    if (item.type === 'numeric' && !Number.isFinite(sample.answer)) {
      throw new Error(`Problem ${item.id} generated an invalid numeric answer.`);
    }
    if (item.type === 'multiple-choice' && !item.choices.some((choice) => choice.id === sample.answer)) {
      throw new Error(`Problem ${item.id} generated an unknown multiple-choice answer ID.`);
    }
  }
}
