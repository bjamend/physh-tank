// Example numeric template. Delete or replace it when adding your own questions.
function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

export const impulse = {
  id: 'momentum-impulse-01',
  type: 'numeric',
  unit: 'Momentum',
  topicsByUnit: {
    Momentum: ['Impulse', 'Force and momentum'],
  },

  generate() {
    const force = pick([40, 50, 60, 80, 100, 120]); // N
    const duration = pick([0.10, 0.15, 0.20, 0.25, 0.30, 0.40]); // s
    return {
      force,
      duration,
      answer: force * duration, // N s
    };
  },

  statement(v) {
    return `A constant horizontal force of ${v.force} N acts on a cart for ${v.duration.toFixed(2)} s. What is the magnitude of the impulse delivered to the cart?`;
  },

  scaffolding: {
    guided: {
      steps: [
        {
          title: 'Identify the relevant quantities',
          text: 'The force is constant and acts over a known time interval. What quantity relates force and time to a change in momentum?',
        },
        {
          title: 'Write the impulse relationship',
          text: 'For a constant force, impulse equals the magnitude of the force multiplied by the duration of the interaction.',
          math: String.raw`J = F\Delta t`,
        },
        {
          title: 'Calculate the impulse',
          text: 'Substitute the given values, then report the magnitude in newton-seconds.',
        },
      ],
    },
    moderate: {
      text: 'Think about how the duration of a constant force affects the change in momentum. Use the impulse relationship to calculate the magnitude.',
    },
    independent: {},
  },

  equationHints: [
    String.raw`\vec J = \Delta\vec p`,
    String.raw`J = F\Delta t\quad\text{(constant force, magnitude)}`,
  ],
  solutionIntro: 'For a constant force, the impulse magnitude is the force multiplied by the time interval:',
  symbolicSolution: [String.raw`J = F\Delta t`],
  answerUnit: 'N·s',
};
