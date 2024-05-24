const express = require('express');
const router = express.Router();
require('dotenv').config();
const minioClient = require('./minio');
const multer = require('multer');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');
const stream = require('stream');
const { json } = require('body-parser');

const upload = multer();

router.post('/upload/:type', jwt.authenticateToken, upload.single('file'), (req, res) => {
    const { type } = req.params;
    const validTypes = ['profile', 'portfolio', 'project'];
    const file = req.file;
    const jsonData = JSON.parse(req.body.data);

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    if (!validTypes.includes(type)) {
        return res.status(400).send('Invalid upload type.');
    }

    const bucketName = 'matching';
    const filePath = `${type}/${file.originalname}`;
    const fileStream = new stream.PassThrough();
    fileStream.end(req.file.buffer);

    // 파일 스트림을 MinIO 버킷에 업로드하는 Promise 생성
    const uploadPromise = new Promise((resolve, reject) => {
        minioClient.putObject(bucketName, filePath, fileStream, req.file.size, (err, objInfo) => {
            if (err) {
                reject(err);
            } else {
                resolve(objInfo);
            }
        });
    });

    uploadPromise.then(async (objInfo) => {
        const url = `http://${process.env.MINIO_END_POINT}:${process.env.MINIO_PORT}/matching/${filePath}`;
        try {
            switch(type) {
                case 'profile':
                    await db.TB_PF.update({ PF_IMG: url }, { where: { PF_SN: jsonData.pfSn } });
                    break;
                case 'portfolio':
                    await db.TB_PFOL.create({PFOL_SN: jsonData.pfolSn},{ URL: url });
                    break;
                case 'project':
                    await db.TB_PJT.update({ PJT_IMG: url }, { where: { PJT_SN: jsonData.pjtSn } });
                    break;
            }
            res.status(200).send('File uploaded successfully.');
        } catch (error) {
            console.error('Database update failed:', error);
            return res.status(500).send('Database update failed.');
        }
    }).catch((error) => {
        console.error('Failed to upload the file:', error);
        return res.status(500).send('Failed to upload the file.');
    });
});

module.exports = router;