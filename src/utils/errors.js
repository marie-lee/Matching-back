const {logger} = require('./logger');

const throwError = (message) => {
    logger.error(message);
    throw Error(message);
}

module.exports = {throwError}