const { formatDuration, postSlackMessage } = require('./builderUtils.js');

/**
 * Ordered list of {name, start, end} entries. `end` is null while running.
 *
 * Tracks how long each main build section took, so a duration summary can be
 * posted to Slack (as a thread reply) once the build finishes or is
 * interrupted. Sections are recorded in the order they are started; a
 * section name may be started/ended more than once (e.g. "build_graph" runs
 * again after a GTFS fallback rebuild) and each run is kept as a separate
 * entry.
 */
const sections = [];

/**
 * Marks the start of a named build section.
 * @param {string} name human-readable section label, e.g. "Seeding"
 */
function startSection(name) {
  sections.push({ name, start: Date.now(), end: null });
}

/**
 * Marks the end of the most recently started, still-running section with
 * the given name.
 * @param {string} name section label passed to the matching startSection call
 */
function endSection(name) {
  const section = [...sections]
    .reverse()
    .find(s => s.name === name && s.end === null);
  if (section) {
    section.end = Date.now();
  }
}

/**
 * Wraps an async function with startSection/endSection calls, ending the
 * section even if the wrapped function throws.
 * @param {string} name section label
 * @param {() => Promise<any>} fn function to time
 * @returns {Promise<any>}
 */
async function timeSection(name, fn) {
  startSection(name);
  try {
    return await fn();
  } finally {
    endSection(name);
  }
}

/**
 * Builds a human-readable, newline-separated summary of every section
 * recorded so far, including ones that never finished (marked "interrupted").
 * Returns null if no sections have been recorded yet.
 * @returns {string|null}
 */
function getSummary() {
  if (sections.length === 0) {
    return null;
  }
  const lines = sections.map(({ name, start, end }) => {
    if (end === null) {
      return `• ${name}: interrupted after ${formatDuration(Date.now() - start)}`;
    }
    return `• ${name}: ${formatDuration(end - start)}`;
  });
  return lines.join('\n');
}

/**
 * Posts the recorded section summary as a Slack message, if any sections
 * have been recorded. No-op if nothing has been tracked yet.
 * @param {string} prefix text prepended before the summary, e.g. "Section timings"
 * @param {string} level Slack message level, passed through to postSlackMessage
 */
async function postSectionSummary(prefix, level) {
  const summary = getSummary();
  if (summary) {
    await postSlackMessage(`${prefix}:\n${summary}`, level);
  }
}

module.exports = {
  timeSection,
  postSectionSummary,
};
