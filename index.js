const { postSlackMessage } = require('./util');
const { update } = require('./task/Update');
const SPLIT_BUILD_TYPE = process.env.SPLIT_BUILD_TYPE || 'NO_SPLIT_BUILD';

let message = '';

switch (SPLIT_BUILD_TYPE) {
  case 'ONLY_BUILD_STREET_GRAPH':
    message = 'Starting street only graph data build';
    break;
  case 'USE_PREBUILT_STREET_GRAPH':
    message = 'Starting graph data build from prebuilt street graph';
    break;
  default:
    message = 'Starting data build';
    break;
}

postSlackMessage(message)
  .then(response => {
    if (response.ok) {
      global.messageTimeStamp = response.ts;
    }
  })
  .catch(err => {
    console.log(err);
  })
  .finally(() => {
    update();
  });
