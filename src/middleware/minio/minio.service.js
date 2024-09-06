require('dotenv').config();
const {logger} = require('../../utils/logger');
const db = require('../../config/db/db');
const minioClient = require('./minio');
const stream = require('stream');

class minio {
    async deleteFile(fileName){
        try {
            await minioClient.removeObject('matching', fileName);
        } catch (error) {
            throw error;
        }
    }

    async upload(file, type, serialNum, transaction){
        const validTypes = ['profile', 'portfolio', 'project'];

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }
    
        if (!validTypes.includes(type)) {
            return res.status(400).send('Invalid upload type.');
        }

        const bucketName = 'matching';
        const filePath = `${type}/${serialNum}_${file.originalname}`;
        const fileStream = new stream.PassThrough();
        fileStream.end(file.buffer);

        // 파일 스트림을 MinIO 버킷에 업로드하는 Promise 생성
        const uploadPromise = new Promise((resolve, reject) => {
            minioClient.putObject(bucketName, filePath, fileStream, file.size, (err, objInfo) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(objInfo);
                }
            });
        });

        try {
            const objInfo = await uploadPromise;
            const url = `http://${process.env.MINIO_END_POINT}:${process.env.MINIO_PORT}/matching/${filePath}`;

            switch(type) {
                case 'profile':
                    await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: serialNum }, transaction: transaction});
                    break;
                case 'portfolio':
                    await db.TB_PFOL_MEDIA.create({PFOL_SN: serialNum, URL: url}, { transaction });
                    break;
                case 'project':
                    await db.TB_PJT.update({ PJT_IMG: url }, { where: { PJT_SN: serialNum }, transaction: transaction});
                    break;
            }
        } catch (error) {
            logger.error('Failed to upload the file or update the database:', error);
            throw error;
        }
    }

    async profileUpload(file, serialNum){
        if (!file) {
            throw new Error('파일이 존재하지 않습니다.');
        }

        const bucketName = 'matching';
        const filePath = `profile/${serialNum}_${file.originalname}`;
        const fileStream = new stream.PassThrough();
        fileStream.end(file.buffer);

        // 파일 스트림을 MinIO 버킷에 업로드하는 Promise 생성
        const uploadPromise = new Promise((resolve, reject) => {
            minioClient.putObject(bucketName, filePath, fileStream, file.size, (err, objInfo) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(objInfo);
                }
            });
        });
        return `http://${process.env.MINIO_END_POINT}:${process.env.MINIO_PORT}/matching/${filePath}`;
    }

    async portfolioUpload(file, mainYn, serialNum, transaction, type) {

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }

        const bucketName = 'matching';
        const filePath = `portfolio/${serialNum}_${file.originalname}`;
        const fileStream = new stream.PassThrough();
        fileStream.end(file.buffer);

        // 파일 스트림을 MinIO 버킷에 업로드하는 Promise 생성
        const uploadPromise = new Promise((resolve, reject) => {
            minioClient.putObject(bucketName, filePath, fileStream, file.size, (err, objInfo) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(objInfo);
                }
            });
        });

        try {
            const objInfo = await uploadPromise;
            const url = `http://${process.env.MINIO_END_POINT}:${process.env.MINIO_PORT}/matching/${filePath}`;
            await db.TB_PFOL_MEDIA.create({PFOL_SN: serialNum, URL: url, MAIN_YN: mainYn, TYPE:type}, {transaction});
        } catch (error) {
            logger.error('Failed to upload the file or update the database:', error);
            throw error;
        }
    }
}

module.exports = new minio();