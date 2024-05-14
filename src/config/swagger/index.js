const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  swaggerDefinition: {
    openapi: "3.0.0", // OpenAPI 버전 명시
    components: {
      securitySchemes: {
        Authorization: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    info: { 
      title: "MATCHING API",
      version: process.env.VERSION,
      description: "MATCHING Backend API",
    },
    security: [
      {
        Authorization: [],
      },
    ],
    servers: [
      {
        url: "http://localhost:8080/",
      },
    ],
  },
    apis: ["./src/app.js", "./src/route/*.js"], // api는 /routes 파일 아래 js 파일 내에 정의하고 있으며, /swagger 폴더 아래 swagger 설정을 정의하고 있음
  };
  
const specs = swaggerJsdoc(options);
  
module.exports = { swaggerUi, specs };