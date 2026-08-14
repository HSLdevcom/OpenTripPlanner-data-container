const through = require('through2');
const logger = require('../logger');

module.exports = {
  testNetexFile: () => {
    return through.obj(function (file, encoding, callback) {
      if (process.env.SKIP_OTP_TESTS) {
        logger.info(
          'OTP test skipped because the SKIP_OTP_TESTS environment variable is set',
        );
        return callback(null, file);
      }
      // TODO add test
      return callback(null, file);
    });
  },
};
