// Modules
const express = require('express');

// Utils
const { swaggerUi, specs } = require("./config/swagger/index");

// DB
const db = require('./config/db/db');

// Middlewares
require('dotenv').config();

// ctrl
const memberCtrl = require('./api/member/member.ctrl');

const app = express();

// JSON 형식의 요청 본문을 파싱하기 위한 미들웨어
app.use(express.json());

// URL 인코딩된 요청 본문을 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true }));

// db 동기화
db.sync({ force: false }).then(() => {
  console.log("데이터베이스 동기화 완료");
}).catch((err) => {
  console.error("동기화 중 에러 발생:", err);
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Hello Express
 *     description: GET 요청을 통해 "Hello, Express!" 메시지를 반환합니다.
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Hello, Express!"
 */
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/api/member", memberCtrl);

app.listen(process.env.PORT, () => {
  console.log('Server is running on port 8080');
});