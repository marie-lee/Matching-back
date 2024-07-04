const {logger} = require('./logger');

const throwError = (message) => {
    logger.error(message);
    throw new   Error(message);
}

module.exports = {throwError}