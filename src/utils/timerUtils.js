const { formatDuration } = require('./formatUtils.js');

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
 * Builds a simple ASCII table listing every section recorded so far and how long
 * it took, including ones that never finished (marked "interrupted"). Returns
 * null if no sections have been recorded yet.
 * @returns {string|null}
 */
function getSummary() {
  if (sections.length === 0) {
    return null;
  }
  const rows = sections.map(({ name, start, end }) => [
    name,
    end === null
      ? `interrupted after ${formatDuration(Date.now() - start)}`
      : formatDuration(end - start),
  ]);
  const nameHeader = 'Section';
  const durationHeader = 'Duration';
  const nameWidth = Math.max(
    nameHeader.length,
    ...rows.map(([name]) => name.length),
  );
  const durationWidth = Math.max(
    durationHeader.length,
    ...rows.map(([, duration]) => duration.length),
  );
  const formatRow = (name, duration) =>
    `${name.padEnd(nameWidth)}  ${duration.padEnd(durationWidth)}`;
  const lines = [
    formatRow(nameHeader, durationHeader),
    '-'.repeat(nameWidth + durationWidth + 2),
    ...rows.map(([name, duration]) => formatRow(name, duration)),
  ];
  return lines.join('\n');
}

module.exports = {
  timeSection,
  getSummary,
};
