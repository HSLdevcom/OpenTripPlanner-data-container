const {
  postSlackMessage,
  finalizeBuild,
  getStartBuildMessage,
  waitForNetwork,
} = require('./utils/builderUtils.js');
const { update } = require('./tasks/Update');
const { SPLIT_BUILD_TYPE, timezone } = require('./config.js');
const logger = require('./logger');

/**
 * Safety net for crashes/unexpected termination that happen outside the
 * normal try/catch in Update.js#update (which already reports failures and
 * posts the section-timing summary itself). If a build is in flight and
 * hasn't been finalized yet, report whatever section timings were recorded
 * so far as a thread reply, and mark the main message as interrupted, so the
 * "Starting build..." message doesn't just look stuck forever.
 */
async function reportUnexpectedTermination(err, exitCode) {
  logger.error(`Fatal error: ${err && err.stack ? err.stack : err}`);
  if (global.buildFinalized) {
    // finalizeBuild (called from update() or a previous invocation of this
    // function) always calls process.exit itself right after setting this
    // flag, so if we get here with buildFinalized already true, the build
    // must have succeeded (a failure's finalizeBuild call would already
    // have exited the process with code 1 before this could fire). Don't
    // let an unrelated stray crash/signal flip that successful outcome to a
    // failure exit code (and don't post a misleading "interrupted" message
    // for a build that already finished).
    process.exit(0);
    return;
  }
  if (global.messageTimeStamp) {
    await finalizeBuild({
      statusMessage: 'Build interrupted unexpectedly',
      statusLevel: 'error',
      summaryPrefix: 'Build interrupted unexpectedly. Section timings so far',
      summaryLevel: 'error',
      exitCode,
    });
    return;
  }
  process.exit(exitCode);
}

logger.info(`Using timezone: ${timezone}`);

process.on('uncaughtException', err => reportUnexpectedTermination(err, 1));
process.on('unhandledRejection', err => reportUnexpectedTermination(err, 1));
process.on('SIGTERM', () =>
  reportUnexpectedTermination(new Error('Received SIGTERM'), 0),
);

waitForNetwork().then(() => {
  postSlackMessage(getStartBuildMessage(SPLIT_BUILD_TYPE))
    .then(response => {
      if (response.ok) {
        global.messageTimeStamp = response.ts;
      }
    })
    .catch(err => {
      logger.error(err);
    })
    .finally(() => {
      update();
    });
});
