const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');
const {
  createLogger,
  format,
  transports,
} = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const { combine, timestamp, printf, colorize, errors, splat } = format;

const logDirectory = 'logs';
const logLevel = 'debug';  // 로깅 수준 설정

// 로그 디렉토리 존재 확인 및 생성
if (!existsSync(logDirectory)) {
  mkdirSync(logDirectory);
}

// 로그 파일 이름 설정
const allLogsFilename = join(logDirectory+ '/all', 'all-%DATE%.log');
const reqResLogsFilename = join(logDirectory+ '/reqRes', 'req-res-%DATE%.log');
const errorLogsFilename = join(logDirectory + '/error', 'error-%DATE%.log');

/**
 * 콘솔 로그 출력 포맷 설정
 */
const consoleOutputFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf((info) => {
    // 수정된 부분
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message} : ${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

/**
 * 파일 로그 출력 포맷 설정
 */
const fileOutputFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level} ${info.message} : ${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

/**
 * 요청/응답 로그 필터링 포맷
 */
const reqResFilter = format((info, opts) => {
  if (
    (info.level === 'info') &&
    (info.message.includes('GET') || info.message.includes('POST') || info.message.includes('PUT') || info.message.includes('DELETE'))
  ) {
    return info;
  }
  return false;
});

const logger = createLogger({
  level: logLevel,  // 로깅 수준 적용
  exitOnError: false,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat(),
    errors({ stack: true })
  ),
  transports: [
    // 콘솔 로그 출력
    new transports.Console({
      handleExceptions: true,
      format: consoleOutputFormat,
    }),
    // 전체 로그 파일 출력
    new DailyRotateFile({
      handleExceptions: true,
      format: fileOutputFormat,
      filename: allLogsFilename,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // 요청 및 응답 로그 파일 출력 (info 레벨)
    new DailyRotateFile({
      filename: reqResLogsFilename,
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(reqResFilter(), fileOutputFormat),
    }),
    // 에러 로그 파일 출력 (error 레벨)
    new DailyRotateFile({
      filename: errorLogsFilename,
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileOutputFormat,
    }),
  ],
});

// 요청 및 응답 로깅을 위한 스트림 설정
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = { logger, stream };
