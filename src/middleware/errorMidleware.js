const {logger,stream} = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // 에러 로그 기록
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip} - Stack: ${err.stack}`);

  // 클라이언트에 에러 응답 보내기
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};

module.exports = errorMiddleware;
