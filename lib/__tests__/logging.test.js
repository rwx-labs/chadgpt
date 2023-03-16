const logging = require("../logging.js");

describe('logging', () => {
  describe('createLogger', () => {
    it('should return a logging object', () => {
      const logger = logging.createLogger("test");

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('error');
    });
  });
});
