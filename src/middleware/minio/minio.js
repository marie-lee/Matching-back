const minio = require('minio');
require('dotenv').config();

const minioClient = new minio.Client({
    endPoint: process.env.MINIO_END_POINT,
    port: parseInt(process.env.MINIO_PORT, 10),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

module.exports = minioClient;