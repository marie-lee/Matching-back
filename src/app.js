// Modules
const express = require('express');
const bodyParser = require('body-parser');
const morganMiddleware = require('./middleware/morganMiddleware');
const errorMiddleware = require('./middleware/errorMidleware');
const { logger } = require('./utils/logger');

// Utils
const { swaggerUi, swaggerDocument } = require("./config/swagger/index");

// DB
const db = require('./config/db/db');

// Middlewares
require('dotenv').config();

// ctrl
const memberCtrl = require('./api/member/member.ctrl');
const profileCtrl = require('./api/profile/profile.ctrl');
const projectCtrl = require('./api/projects/project.ctrl');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// morgan 미들웨어 설정
app.use(morganMiddleware);
// 에러 미들웨어 설정
app.use(errorMiddleware);
// JSON 형식의 요청 본문을 파싱하기 위한 미들웨어
app.use(express.json());
// URL 인코딩된 요청 본문을 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// db 동기화
db.sync({ force: false }).then(() => {
  console.log("데이터베이스 동기화 완료");
}).catch((err) => {
  console.error("동기화 중 에러 발생:", err);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/member", memberCtrl);
app.use("/api/member", profileCtrl);
app.use("/api", projectCtrl);

app.listen(process.env.PORT, () => {
  logger.info('Server is running on port 8080');
});
