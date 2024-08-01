const swaggerUi = require("swagger-ui-express");
const yamljs = require('yamljs');
const swaggerDocument = yamljs.load(__dirname+'/swagger.yaml');

module.exports = { swaggerUi, swaggerDocument };