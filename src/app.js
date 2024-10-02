// Modules
const express = require('express');
const bodyParser = require('body-parser');
const morganMiddleware = require('./middleware/morganMiddleware');
const errorMiddleware = require('./middleware/errorMidleware');
const { logger } = require('./utils/logger');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { setupSocket } = require('./utils/alarm');
const fs = require('fs');

// Utils
const { swaggerUi, swaggerDocument } = require("./config/swagger/index");

// DB
const db = require('./config/db/db');

// Middlewares
require('dotenv').config();

// ctrl
const memberCtrl = require('./api/member/member.ctrl');
const profileCtrl = require('./api/profile/profile.ctrl');
const projectCtrl = require('./api/project/project.ctrl');
const wbsCtrl = require('./api/wbs/wbs.ctrl');
const statusCtrl = require('./api/status/status.ctrl');
const recommendationCtrl = require('./api/recommendation/recommendation.ctrl');

const scheduler = require('./utils/scheduler');
const https = require("https");

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

// CORS 설정
const corsOptions = {
  origin : '*',
  credential: true
};
app.use(cors(corsOptions));

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
app.use("/api", statusCtrl);
app.use("/api", recommendationCtrl);
app.use("/api", wbsCtrl);

// https 인증서
const privateKey = fs.readFileSync('/etc/letsencrypt/live/218.232.137.30.nip.io/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/218.232.137.30.nip.io/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/218.232.137.30.nip.io/chain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

// 소켓 설정
const server = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
const io = socketIo(httpsServer, {cors: {
    origin: "*"
  }
});

// 소켓 설정
setupSocket(io);

server.listen(process.env.PORT, () => {
  logger.info('Server is running on port 8080');
});

httpsServer.listen(process.env.HTTPS_PORT,() => {
  logger.info('Server is running on port 443');
});
