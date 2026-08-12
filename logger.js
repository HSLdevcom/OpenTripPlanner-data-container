const path = require('path');
const winston = require('winston');

/*
 * Single shared logger used across the whole build pipeline. Every log line includes:
 *  - a timestamp, wrapped in [] (unlike OTP's own bare "07:44:58.812" style) so builder log
 *    lines are instantly recognizable at a glance, even when interleaved with raw OTP output
 *  - the log level
 *  - the currently running gulp task, if any (e.g. "osm:update"), omitted otherwise
 *  - the file and line number that produced the log line, similar to OpenTripPlanner's own
 *    "(OtpStartupInfo.java:48)" style log tags
 *
 * Example output:
 *   [07:44:58.813] INFO [osm:update] (OSMPreprocessing.js:48) Running OSM preprocessing...
 *   [07:44:58.813] INFO (Update.js:33) Starting seeding
 */
const baseLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(
      ({ timestamp, level, message, gulpTask, callsite }) => {
        const taskTag = gulpTask ? `[${gulpTask}] ` : '';
        const callsiteTag = callsite ? `(${callsite}) ` : '';
        return `[${timestamp}] ${level.toUpperCase()} ${taskTag}${callsiteTag}${message}`;
      },
    ),
  ),
  transports: [
    new winston.transports.Console({
      // Route error-level logs to stderr (matching the previous process.stderr.write
      // behavior for error messages), everything else stays on stdout.
      stderrLevels: ['error'],
    }),
  ],
});

/**
 * Walks the call stack to find the file and line number of the code that called into this
 * logger (skipping this module's own frames), e.g. "OSMPreprocessing.js:48".
 */
function getCallsite() {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const target = {};
  Error.captureStackTrace(target, getCallsite);
  const { stack } = target;
  Error.prepareStackTrace = originalPrepareStackTrace;

  // stack[0] is this module's own log() wrapper; the first frame outside logger.js is the
  // real caller.
  const callerFrame = stack.find(frame => frame.getFileName() !== __filename);
  if (!callerFrame) {
    return '';
  }
  const fileName = path.basename(callerFrame.getFileName() || '');
  const lineNumber = callerFrame.getLineNumber();
  return `${fileName}:${lineNumber}`;
}

function log(level, message) {
  baseLogger.log({
    level,
    message,
    gulpTask: global.currentGulpTask,
    callsite: getCallsite(),
  });
}

module.exports = {
  info: message => log('info', message),
  warn: message => log('warn', message),
  error: message => log('error', message),
};
