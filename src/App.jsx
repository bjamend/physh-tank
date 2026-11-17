import { useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { problemBank } from './problems/index.js';
import {
  buildTopicCatalog,
  checkResponse,
  filterProblemsByTopics,
  topicKey,
  createProblemPicker,
  displayAnswer,
  validateProblemBank,
} from './engine/problemBank.js';
import {
  FIXED_COUNTS,
  GUIDANCE_LEVELS,
  guidanceForQuestion,
  hasValidSubmission,
  isFinalQuestion,
} from './engine/session.js';
import { createQuestionRecord, getQuestionOutcome, countOutcomes, countAttempts } from './engine/sessionReport.js';
import './App.css';

validateProblemBank(problemBank);

function BlockMath({ math }) {
  const html = katex.renderToString(math, {
    displayMode: true,
    throwOnError: false,
    strict: 'warn',
  });
  return <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

const TOPIC_CATALOG = buildTopicCatalog(problemBank);
const ALL_TOPIC_KEYS = TOPIC_CATALOG.flatMap(({ unit, topics }) =>
  topics.map((topic) => topicKey(unit, topic))
);

function GuidanceSlider({ guidance, onChange, locked = false }) {
  const guidanceIndex = GUIDANCE_LEVELS.findIndex((level) => level.id === guidance);
  return (
    <div className={`guidance-controls guidance-controls--${guidance}${locked ? ' guidance-controls--locked' : ''}`}>
      <input
        id="guidance-slider"
        aria-label={locked ? 'Automatic guidance level' : 'Guidance level'}
        className="guidance-slider"
        type="range"
        min="0"
        max="2"
        step="1"
        value={guidanceIndex}
        disabled={locked}
        title={locked ? 'Guidance decreases automatically during this session' : undefined}
        aria-valuetext={GUIDANCE_LEVELS[guidanceIndex].label}
        onChange={(event) => onChange(GUIDANCE_LEVELS[Number(event.target.value)].id)}
      />
      <div className="guidance-scale" aria-hidden="true">
        {GUIDANCE_LEVELS.map((level) => (
          <span
            key={level.id}
            className={`guidance-scale-label guidance-scale-label--${level.id}${guidance === level.id ? ' is-active' : ''}`}
          >
            {level.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AquariumProgress({ completed, count }) {
  // Only fixed-length sessions use the progress bar. A finished session
  // passes its full target count so the fish reaches the finish.
  const safeCompleted = Math.max(0, Math.min(completed, count));
  return (
    <div className="aquarium-progress">
      <div className="aquarium-progress-meta">
        <span>{safeCompleted} of {count} completed</span>
      </div>
      <div
        className="aquarium-progress-track"
        role="progressbar"
        aria-label="Problems completed"
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={safeCompleted}
      >
        <div
          className="aquarium-progress-fill"
          style={{ width: `${(safeCompleted / count) * 100}%` }}
        />
        <img
          className="aquarium-progress-fish"
          src={`${import.meta.env.BASE_URL}fish.svg`}
          alt=""
          aria-hidden="true"
          style={{ left: `${(safeCompleted / count) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SessionReport({ results, skipped }) {
  const totals = countOutcomes(results);
  const attempts = countAttempts(results);
  const outcomes = [
    { key: 'correct', label: 'Correct' },
    { key: 'incorrect', label: 'Incorrect' },
    { key: 'unanswered', label: 'No answer' },
  ];
  return (
    <div className="session-report" aria-label="Question-by-question practice report">
      <section className="report-summary-section" aria-label="Problem outcomes">
        <h2 className="report-summary-heading">Problem outcomes</h2>
        <div className="report-totals">
          {outcomes.map(({ key, label }) => (
            <div className={`report-total report-total--${key}`} key={key}>
              <strong>{totals[key]}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="report-summary-section" aria-label="Answer attempts">
        <h2 className="report-summary-heading">Answer attempts</h2>
        <div className="report-attempt-totals">
          <div className="report-attempt-total report-attempt-total--correct">
            <strong>{attempts.correct}</strong>
            <span>Correct attempts</span>
          </div>
          <div className="report-attempt-total report-attempt-total--incorrect">
            <strong>{attempts.incorrect}</strong>
            <span>Incorrect attempts</span>
          </div>
        </div>
      </section>
      <div className="report-entries">
        {results.map((record, index) => {
          const outcome = getQuestionOutcome(record);
          return (
            <article className="report-entry" key={`${record.id}-${index}`}>
              <div className="report-entry-header">
                <div className="report-entry-identification">
                  <strong>Problem {record.number}</strong>
                  <span>{record.unit} · {record.id}</span>
                </div>
                <span className={`report-status report-status--${outcome}`}>
                  {outcome === 'correct' ? 'Correct' : outcome === 'incorrect' ? 'Incorrect' : 'Not answered'}
                </span>
              </div>
              <div className="report-attempt-trail" aria-label={`Answer history for problem ${record.number}`}>
                {record.attempts.map((attempt, attemptIndex) => (
                  <span className={`report-attempt report-attempt--${attempt.correct ? 'correct' : 'incorrect'}`}
                    key={attemptIndex}>
                    {attempt.correct ? 'Correct' : 'Incorrect'}
                  </span>
                ))}
                {record.attempts.length === 0 && <span className="report-no-attempts">No answer submitted</span>}
                {record.solutionViewed && <span className="report-solution-viewed">Solution viewed</span>}
              </div>
              <details className="report-details">
                <summary>View question and responses</summary>
                <p className="report-question">{record.question}</p>
                {record.attempts.length > 0 ? (
                  <ol className="report-submissions">
                    {record.attempts.map((attempt, attemptIndex) => (
                      <li key={attemptIndex}>
                        <span>{attempt.display}</span>
                        <span className={`report-submission-result${attempt.correct ? ' is-correct' : ''}`}>
                          {attempt.correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="report-unanswered-detail">No answer was submitted.</p>}
              </details>
            </article>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <details className="report-skipped">
          <summary>{skipped.length} {skipped.length === 1 ? 'question' : 'questions'} skipped during practice</summary>
          <div className="report-skipped-list">
            {skipped.map((record, index) => (
              <div key={`${record.id}-${index}`}>
                <strong>{record.unit}</strong>
                <span>{record.id}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function App() {
  const [phase, setPhase] = useState('setup'); // setup → practice → finished

  // Topic selection remains a draft until Apply topics is clicked.
  const [selectedTopics, setSelectedTopics] = useState(() => [...ALL_TOPIC_KEYS]);
  const [draftTopics, setDraftTopics] = useState(() => [...ALL_TOPIC_KEYS]);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const eligibleProblems = useMemo(
    () => filterProblemsByTopics(problemBank, selectedTopics),
    [selectedTopics]
  );

  // Preferences are local to this browser tab; no accounts or data storage.
  const [setupMode, setSetupMode] = useState('fixed');
  const [setupCount, setSetupCount] = useState(5);
  const [setupGuidanceMode, setSetupGuidanceMode] = useState('fade');
  const [setupGuidance, setSetupGuidance] = useState('guided');

  const [session, setSession] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [active, setActive] = useState(null);
  const pickerRef = useRef(null);
  const [answer, setAnswer] = useState('');
  const [hasAttempted, setHasAttempted] = useState(false);
  const [hasViewedSolution, setHasViewedSolution] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [skippedQuestions, setSkippedQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [showEquations, setShowEquations] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const allTopicsEnabled = selectedTopics.length === ALL_TOPIC_KEYS.length;
  const matchingDraftCount = filterProblemsByTopics(problemBank, draftTopics).length;
  const topicSummary = allTopicsEnabled
    ? 'All topics'
    : selectedTopics.length === 1 ? '1 topic' : `${selectedTopics.length} topics`;

  function toggleTopicPicker() {
    if (!topicPickerOpen) setDraftTopics([...selectedTopics]);
    setTopicPickerOpen((open) => !open);
  }

  function toggleDraftTopic(key, enabled) {
    setDraftTopics((current) => enabled
      ? [...new Set([...current, key])]
      : current.filter((item) => item !== key));
  }

  function toggleDraftUnit(unit, enabled) {
    const group = TOPIC_CATALOG.find((item) => item.unit === unit);
    const keys = group.topics.map((topic) => topicKey(unit, topic));
    setDraftTopics((current) => enabled
      ? [...new Set([...current, ...keys])]
      : current.filter((item) => !keys.includes(item)));
  }

  function applyTopics() {
    const matching = filterProblemsByTopics(problemBank, draftTopics);
    if (!matching.length) return;
    setSelectedTopics([...draftTopics]);
    setTopicPickerOpen(false);
  }

  function clearResponse() {
    setAnswer('');
    setFeedback(null);
    setHasAttempted(false);
    setHasViewedSolution(false);
    setCurrentAttempts([]);
    setShowEquations(false);
    setShowSolution(false);
  }

  function startPractice() {
    if (!eligibleProblems.length) return;
    const template = eligibleProblems[Math.floor(Math.random() * eligibleProblems.length)];
    pickerRef.current = createProblemPicker(eligibleProblems, template.id);
    setSession({
      mode: setupMode,
      count: setupCount,
      guidanceMode: setupMode === 'fixed' ? setupGuidanceMode : 'fixed',
      guidance: setupGuidance,
    });
    setActive({ template, values: template.generate() });
    setQuestionIndex(0);
    setSessionResults([]);
    setSkippedQuestions([]);
    clearResponse();
    setTopicPickerOpen(false);
    setPhase('practice');
  }

  function returnToSetup() {
    pickerRef.current = null;
    setActive(null);
    setSession(null);
    setSessionResults([]);
    setSkippedQuestions([]);
    clearResponse();
    setPhase('setup');
  }

  function checkAnswer(event) {
    event.preventDefault();
    const result = checkResponse(active.template, active.values, answer);
    if (hasValidSubmission(active.template, answer)) {
      setHasAttempted(true);
      setCurrentAttempts((previous) => [...previous, { value: answer, correct: result.correct }]);
    }
    setFeedback(result);
  }

  function nextProblem() {
    if (!session || !active) return;
    const completed = hasAttempted || hasViewedSolution;
    if (!completed && eligibleProblems.length < 2) return;

    const record = createQuestionRecord(active, questionIndex + 1, currentAttempts, hasViewedSolution, !completed);
    if (completed) setSessionResults((previous) => [...previous, record]);
    else setSkippedQuestions((previous) => [...previous, record]);

    if (completed && isFinalQuestion(session, questionIndex)) {
      setPhase('finished');
      return;
    }
    // Skipping replaces the current slot and is listed separately in the report.
    // Attempted and solution-revealed questions advance the fixed-session count.
    if (completed) setQuestionIndex((index) => index + 1);
    const template = pickerRef.current.next();
    setActive({ template, values: template.generate() });
    clearResponse();
  }

  function endPractice() {
    // Include the question currently on-screen, even when no answer was submitted.
    if (active) {
      setSessionResults((previous) => [
        ...previous,
        createQuestionRecord(active, questionIndex + 1, currentAttempts, hasViewedSolution),
      ]);
    }
    setPhase('finished');
  }

  const problem = active?.template;
  const values = active?.values;
  const guidance = session ? guidanceForQuestion(session, questionIndex) : setupGuidance;
  const guidanceContent = problem?.scaffolding[guidance];
  const choices = problem?.type === 'multiple-choice'
    ? (values.choiceOrder
      ? values.choiceOrder.map((id) => problem.choices.find((choice) => choice.id === id)).filter(Boolean)
      : problem.choices)
    : [];
  const completed = hasAttempted || hasViewedSolution;
  const finalQuestion = Boolean(session && isFinalQuestion(session, questionIndex));

  return (
    <main className="page">
      <header className="site-header">
        <div className="brand">
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="The Physh Tank"
          />
        </div>
        <span className="version">Prototype · 0.6.11</span>
      </header>

      <div className="content">
        {phase === 'setup' && (
          <>
            <section className="topic-selector" aria-label="Practice topic selection">
              <button
                type="button"
                className="topic-selector-toggle"
                aria-expanded={topicPickerOpen}
                aria-controls="topic-picker-panel"
                onClick={toggleTopicPicker}
              >
                <span className="topic-selector-heading">Practice topics</span>
                <span className="topic-selector-summary">{topicSummary} · {eligibleProblems.length} {eligibleProblems.length === 1 ? 'template' : 'templates'}</span>
                <span className="topic-chevron-box" aria-hidden="true">
                  <svg className="topic-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none"
                    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                    <path d={topicPickerOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                  </svg>
                </span>
              </button>
              {topicPickerOpen && (
                <div className="topic-picker-panel" id="topic-picker-panel">
                  <div className="topic-picker-tools">
                    <span>Select a unit or narrow down to specific topics.</span>
                    <div>
                      <button type="button" onClick={() => setDraftTopics([...ALL_TOPIC_KEYS])}>Select all</button>
                      <button type="button" onClick={() => setDraftTopics([])}>Clear</button>
                    </div>
                  </div>
                  <div className="topic-units">
                    {TOPIC_CATALOG.map(({ unit, topics }) => {
                      const unitKeys = topics.map((topic) => topicKey(unit, topic));
                      const checkedCount = unitKeys.filter((key) => draftTopics.includes(key)).length;
                      return (
                        <div className="topic-unit" key={unit}>
                          <label className="topic-checkbox topic-unit-label">
                            <input type="checkbox" checked={checkedCount === unitKeys.length}
                              ref={(element) => {
                                if (element) element.indeterminate = checkedCount > 0 && checkedCount < unitKeys.length;
                              }}
                              onChange={(event) => toggleDraftUnit(unit, event.target.checked)} />
                            <span>{unit}</span>
                          </label>
                          <div className="topic-subtopics">
                            {topics.map((topic) => {
                              const key = topicKey(unit, topic);
                              return (
                                <label className="topic-checkbox" key={key}>
                                  <input type="checkbox" checked={draftTopics.includes(key)}
                                    onChange={(event) => toggleDraftTopic(key, event.target.checked)} />
                                  <span>{topic}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="topic-picker-footer">
                    <span>{matchingDraftCount} {matchingDraftCount === 1 ? 'template' : 'templates'} available</span>
                    <div>
                      <button className="topic-cancel-button" type="button" onClick={toggleTopicPicker}>Cancel</button>
                      <button className="topic-apply-button" type="button" disabled={!matchingDraftCount} onClick={applyTopics}>Apply topics</button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="session-setup-card" aria-label="Practice session setup">
              <h1 className="setup-heading">Practice session</h1>
              <fieldset className="setup-fieldset">
                <legend>Session length</legend>
                <div className="setup-options">
                  <label className={`setup-option${setupMode === 'fixed' ? ' is-selected' : ''}`}>
                    <input type="radio" name="session-mode" checked={setupMode === 'fixed'} onChange={() => setSetupMode('fixed')} />
                    <span>Fixed number</span>
                  </label>
                  <label className={`setup-option${setupMode === 'continuous' ? ' is-selected' : ''}`}>
                    <input type="radio" name="session-mode" checked={setupMode === 'continuous'} onChange={() => setSetupMode('continuous')} />
                    <span>Continuous practice</span>
                  </label>
                </div>
                {setupMode === 'fixed' && (
                  <div className="count-selector" aria-label="Number of problems">
                    {FIXED_COUNTS.map((count) => (
                      <button key={count} type="button" aria-pressed={setupCount === count}
                        className={`count-button${setupCount === count ? ' is-selected' : ''}`}
                        onClick={() => setSetupCount(count)}>
                        <span className="count-button-number">{count}</span>
                        <span className="count-button-unit">problems</span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
              <fieldset className="setup-fieldset">
                <legend>Guidance</legend>
                {setupMode === 'fixed' && (
                  <div className="setup-options">
                    <label className={`setup-option${setupGuidanceMode === 'fade' ? ' is-selected' : ''}`}>
                      <input type="radio" name="guidance-mode" checked={setupGuidanceMode === 'fade'} onChange={() => setSetupGuidanceMode('fade')} />
                      <span>Gradually reduce guidance</span>
                    </label>
                    <label className={`setup-option${setupGuidanceMode === 'fixed' ? ' is-selected' : ''}`}>
                      <input type="radio" name="guidance-mode" checked={setupGuidanceMode === 'fixed'} onChange={() => setSetupGuidanceMode('fixed')} />
                      <span>Choose a starting level</span>
                    </label>
                  </div>
                )}
                {(setupMode === 'continuous' || setupGuidanceMode === 'fixed') ? (
                  <>
                    <GuidanceSlider guidance={setupGuidance} onChange={setSetupGuidance} />
                    <p className="guidance-edit-note">You can change this level at any time while practicing.</p>
                  </>
                ) : (
                  <p className="fade-description">Starts guided and gradually moves toward independent problem solving.</p>
                )}
              </fieldset>
              <div className="setup-actions">
                <button type="button" className="primary-button" disabled={!eligibleProblems.length || topicPickerOpen} onClick={startPractice}>Start practice</button>
              </div>
            </section>
          </>
        )}

        {phase === 'practice' && session && problem && (
          <>
            <div className="session-bar">
              <span className="session-position">
                {session.mode === 'fixed' ? `Problem ${questionIndex + 1} of ${session.count}` : 'Continuous practice'}
              </span>
              <button type="button" className="session-change-button" onClick={returnToSetup}>
                Change settings
              </button>
            </div>
            {session.mode === 'fixed' && (
              <AquariumProgress completed={questionIndex} count={session.count} />
            )}
            <section className="problem-card" aria-label="Physics practice problem">
              <div className="card-top">
                <span className="unit-tag">{problem.unit}</span>
                {/* Keep problem IDs visible during development. */}
                <span className="problem-id">{problem.id}</span>
              </div>
              <p className="problem-text">{problem.statement(values)}</p>

              <GuidanceSlider
                guidance={guidance}
                locked={session.guidanceMode === 'fade'}
                onChange={(level) => {
                  if (session.guidanceMode === 'fade') return;
                  setSession((old) => ({ ...old, guidance: level }));
                  setFeedback(null);
                  setShowEquations(false);
                  setShowSolution(false);
                }}
              />

              {guidance === 'guided' && (
                <div className="guidance-panel guidance-panel--guided">
                  <ol className="guidance-steps">
                    {guidanceContent.steps.map((step) => (
                      <li key={step.title}>
                        <strong>{step.title}</strong>
                        <p>{step.text}</p>
                        {step.math && <BlockMath math={step.math} />}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {guidance === 'moderate' && (
                <div className="guidance-panel guidance-panel--moderate">
                  <p className="guidance-prose">{guidanceContent.text}</p>
                </div>
              )}

              <form onSubmit={checkAnswer} className="answer-form">
                {problem.type === 'numeric' ? (
                  <>
                    <label htmlFor="answer">Your answer</label>
                    <div className="input-row">
                      <input id="answer" inputMode="decimal" type="number" step="any" placeholder="Enter a number"
                        value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null); }} />
                      <span className="unit">{problem.answerUnit}</span>
                      <button type="submit" className="primary-button">Check answer</button>
                    </div>
                  </>
                ) : (
                  <>
                    <fieldset className="choice-fieldset">
                      <legend>Your answer</legend>
                      <div className="choice-list">
                        {choices.map((choice) => (
                          <label key={choice.id} className={`choice-option${answer === choice.id ? ' is-selected' : ''}`}>
                            <input type="radio" name="multiple-choice-answer" value={choice.id} checked={answer === choice.id}
                              onChange={() => { setAnswer(choice.id); setFeedback(null); }} />
                            <span>{choice.text}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="choice-submit"><button type="submit" className="primary-button">Check answer</button></div>
                  </>
                )}
              </form>

              {feedback && (
                <p className={feedback.correct ? 'feedback correct' : 'feedback incorrect'} role="status">
                  {feedback.message}
                </p>
              )}
              <div className="secondary-actions">
                <div className="hint-actions" aria-label="Hints">
                  <button type="button" className="hint-button" aria-expanded={showEquations}
                    onClick={() => setShowEquations(!showEquations)}>
                    {showEquations ? 'Hide equations' : 'Show equations'}
                  </button>
                </div>
                <button type="button" className="solution-button" aria-expanded={showSolution}
                  onClick={() => {
                    if (!showSolution) setHasViewedSolution(true);
                    setShowSolution(!showSolution);
                  }}>
                  {showSolution ? 'Hide solution' : 'Show solution'}
                </button>
              </div>
              {showEquations && (
                <div className="reveal">
                  <strong>Relevant equations</strong>
                  {problem.equationHints.map((equation) => <BlockMath key={equation} math={equation} />)}
                </div>
              )}
              {showSolution && (
                <div className="reveal">
                  <strong>Worked solution</strong>
                  {problem.solutionIntro && <p>{problem.solutionIntro}</p>}
                  {problem.symbolicSolution.map((equation) => <BlockMath key={equation} math={equation} />)}
                  <p className="numeric-answer">
                    {problem.type === 'numeric' ? 'Numerical answer:' : 'Correct answer:'}{' '}
                    <strong>{displayAnswer(problem, values)}</strong>
                  </p>
                </div>
              )}
              <div className="card-footer card-footer--actions-only">
                {!completed && eligibleProblems.length === 1 && (
                  <span className="single-template-note">Only one template matches these topics.</span>
                )}
                <button type="button"
                  className={`next-button ${completed ? 'next-button--advance' : 'next-button--skip'}`}
                  onClick={nextProblem}
                  disabled={!completed && eligibleProblems.length < 2}>
                  <span>{completed ? (finalQuestion ? 'Finish practice' : 'Next problem') : 'Skip problem'}</span>
                  {completed && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"
                      fill="none" stroke="currentColor" strokeWidth="2.3"
                      strokeLinecap="round" strokeLinejoin="round">
                      {finalQuestion ? <path d="m5 12 4 4L19 6" /> : <path d="M4 12h16m-6-6 6 6-6 6" />}
                    </svg>
                  )}
                </button>
              </div>
            </section>
            {session.mode === 'continuous' && (
              <div className="end-session-row">
                <button className="session-change-button" type="button" onClick={endPractice}>End practice</button>
              </div>
            )}
          </>
        )}

        {phase === 'finished' && session && (
          <section className="session-setup-card session-finished session-finished--with-report" aria-label="Practice session finished">
            <h1 className="setup-heading">Practice Complete</h1>
            {session.mode === 'fixed' && (
              <AquariumProgress completed={session.count} count={session.count} />
            )}
            <SessionReport results={sessionResults} skipped={skippedQuestions} />
            <div className="session-finished-actions">
              <button type="button" className="primary-button" onClick={returnToSetup}>Start another session</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
