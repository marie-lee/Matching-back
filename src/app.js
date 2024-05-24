// Modules
const express = require('express');
const morganMiddleware = require('./middleware/morganMiddleware');
const errorMiddleware = require('./middleware/errorMidleware');
const { logger } = require('./utils/logger');

// Utils
const { swaggerUi, specs } = require("./config/swagger/index");

// DB

// Middlewares
require('dotenv').config();


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// morgan 미들웨어 설정
app.use(morganMiddleware);
// 에러 미들웨어 설정
app.use(errorMiddleware);
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

app.listen(process.env.PORT, () => {
  logger.info('Server is running on port 8080');
});
