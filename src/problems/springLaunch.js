// This file contains the content and physics for ONE reusable problem template.
// Changing the guidance level NEVER changes the random variables or final answer.

function randomFrom(options) {
  return options[Math.floor(Math.random() * options.length)];
}

export const springLaunch = {
  id: 'energy-spring-launch-01',
  unit: 'Energy',
  type: 'numeric',
  // Each unit lists the topics this problem practices in that unit.
  topicsByUnit: {
    Energy: ['Spring potential energy', 'Conservation of mechanical energy'],
  },

  generate() {
    const mass = randomFrom([1, 1.5, 2, 2.5, 3, 4]); // kg
    const springConstant = randomFrom([100, 150, 200, 250, 300, 350]); // N/m
    const compression = randomFrom([0.15, 0.2, 0.25, 0.3, 0.35, 0.4]); // m

    return {
      mass,
      springConstant,
      compression,
      answer: compression * Math.sqrt(springConstant / mass), // m/s
    };
  },

  statement(values) {
    return `A ${values.mass.toFixed(1)} kg block rests against a spring with spring constant ${values.springConstant} N/m. The spring is compressed by ${values.compression.toFixed(2)} m. The block is released on a frictionless horizontal surface. What is its speed when the spring returns to its natural length?`;
  },

  // Three presentations of the SAME problem, with the SAME numerical answer.
  // Write the scaffolding once for each template; the UI handles display.
  scaffolding: {
    guided: {
      steps: [
        {
          title: 'Identify the initial and final states',
          text: 'At release, the block is at rest and the spring is compressed. When the spring reaches its natural length, the block is moving. Which energy terms are nonzero in each state?',
        },
        {
          title: 'Set up conservation of energy',
          text: 'The surface is frictionless, so set the initial mechanical energy equal to the final mechanical energy. Start with the general relationship below and identify which terms are zero.',
          math: String.raw`K_i + U_i = K_f + U_f`,
        },
        {
          title: 'Solve for the speed',
          text: 'Write the remaining kinetic and spring potential energy terms, isolate the final speed symbolically, and only then substitute the numerical values.',
        },
      ],
    },
    moderate: {
      text: 'Consider what changes between the compressed-spring state and the instant the spring reaches its natural length. Identify which energy terms are present in each state, then decide what principle relates the two states.',
    },
    independent: {},
  },

  equationHints: [
    String.raw`U_s = \frac{1}{2}kx^2`,
    String.raw`K = \frac{1}{2}mv^2`,
    String.raw`E_i = E_f`,
  ],
  // Same symbolic derivation for every generated numerical instance.
  symbolicSolution: [
    String.raw`\frac{1}{2}kx^2 = \frac{1}{2}mv^2`,
    String.raw`kx^2 = mv^2`,
    String.raw`v = x\sqrt{\frac{k}{m}}`,
  ],
  solutionIntro: "The initial spring potential energy becomes the block's kinetic energy:",
  answerUnit: 'm/s',
  // Preserve the prototype's existing 0.02 m/s minimum tolerance.
  absoluteTolerance: 0.02,
};
