// Example multiple-choice template. Correctness is tied to choice IDs,
// so shuffling the displayed choices never changes which one is correct.
function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const collisionForces = {
  id: 'momentum-collision-forces-01',
  type: 'multiple-choice',
  unit: 'Momentum',
  // Cross-list this problem without creating duplicate copies.
  topicsByUnit: {
    Momentum: ['Collisions'],
    Dynamics: ["Newton's Third Law"],
  },

  generate() {
    return {
      massA: pick([1.0, 1.5, 2.0, 2.5]),
      massB: pick([3.0, 3.5, 4.0, 4.5]),
      choiceOrder: shuffle(['a', 'b', 'equal', 'unknown']),
      answer: 'equal',
    };
  },

  statement(v) {
    return `Cart A (mass ${v.massA.toFixed(1)} kg) collides with cart B (mass ${v.massB.toFixed(1)} kg). During the collision, which cart experiences the larger force magnitude due to the other cart?`;
  },

  choices: [
    { id: 'a', text: 'Cart A experiences a larger force.' },
    { id: 'b', text: 'Cart B experiences a larger force.' },
    { id: 'equal', text: 'The forces have equal magnitudes.' },
    { id: 'unknown', text: 'There is not enough information to tell.' },
  ],

  scaffolding: {
    guided: {
      steps: [
        {
          title: 'Identify the interaction',
          text: 'Consider the force that cart A exerts on cart B and the force that cart B exerts on cart A.',
        },
        {
          title: 'Apply Newton’s Third Law',
          text: 'How do these two forces compare while the carts are in contact?',
          math: String.raw`\vec F_{A\to B} = -\vec F_{B\to A}`,
        },
      ],
    },
    moderate: {
      text: 'Focus on the two forces that the carts exert on each other, rather than on their masses or accelerations.',
    },
    independent: {},
  },

  equationHints: [String.raw`\vec F_{A\to B} = -\vec F_{B\to A}`],
  solutionIntro: 'Newton’s Third Law states that the forces the carts exert on one another are equal in magnitude and opposite in direction. Their accelerations can differ because their masses differ.',
  symbolicSolution: [],
};
