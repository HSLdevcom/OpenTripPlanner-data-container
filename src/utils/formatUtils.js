const { timezone } = require('../config');

/**
 * Formats a Date as a HH:mm:ss clock time in the configured build timezone.
 * @param {Date} date
 * @returns {string}
 */
function formatClockTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Formats a duration in milliseconds as e.g. "1h02m03s", "12m34s" or "34s".
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, '0')}m${String(seconds).padStart(2, '0')}s`;
  }
  if (minutes > 0) {
    return `${minutes}m${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

/**
 * Docker tags don't work with ':' and file names are also prettier without them. We also need to
 * remove milliseconds because they are not relevant and make converting string back to ISO format
 * more difficult.
 * @returns date as string
 */
function getDateStringForDockerTag() {
  return new Date().toISOString().slice(0, -5).concat('Z').replace(/:/g, '.');
}

module.exports = {
  formatClockTime,
  formatDuration,
  getDateStringForDockerTag,
};
