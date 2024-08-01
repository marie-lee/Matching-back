const morgan = require('morgan');
const {logger,stream} = require('../utils/logger');

const morganMiddleware = morgan((tokens, req, res) => {
  const logMessage = `[${tokens.method(req, res)}] ${tokens.url(req, res)} | ${tokens.status(req, res)} | ${tokens.res(req, res, 'content-length')} - ${tokens['response-time'](req, res)} ms | [Request Body] ${JSON.stringify(req.body)}`;

  const statusCode = res.statusCode;
  if (statusCode < 400) {
    logger.info(logMessage);
  } else {
    logger.error(logMessage);
  }
  return null;
});

module.exports = morganMiddleware;
