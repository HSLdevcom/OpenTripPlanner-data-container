const through = require('through2');

module.exports = {
  testNetexFile: () => {
    return through.obj(function (file, encoding, callback) {
      const otpFile = file.history[file.history.length - 1];
      if (process.env.SKIP_OTP_TESTS) {
        process.stdout.write(
          'OTP test skipped because the SKIP_OTP_TESTS environment variable is set\n',
        );
        return callback(null, file);
      }
      // TODO add test
      return callback(null, file);
    });
  },
};
