const {
  postSlackMessage,
  getStartBuildMessage,
  waitForNetwork,
} = require('./utils/builderUtils.js');
const { update } = require('./tasks/Update');
const { SPLIT_BUILD_TYPE, timezone } = require('./config.js');
const logger = require('./logger');

logger.info(`Using timezone: ${timezone}`);

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
