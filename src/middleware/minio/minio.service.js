require('dotenv').config();
const multer = require('multer');
const db = require('../../config/db/db');
const minioClient = require('./minio');
const stream = require('stream');

class minio {
    upload(file, type, serialNum){
        const validTypes = ['profile', 'portfolio', 'project'];

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }
    
        if (!validTypes.includes(type)) {
            return res.status(400).send('Invalid upload type.');
        }

        const bucketName = 'matching';
        const filePath = `${type}/${file.originalname}`;
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

        uploadPromise.then(async (objInfo) => {
            const url = `http://${process.env.MINIO_END_POINT}:${process.env.MINIO_PORT}/matching/${filePath}`;
            try {
                switch(type) {
                    case 'profile':
                        await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: serialNum } });
                        break;
                    case 'portfolio':
                        await db.TB_PFOL.create({PFOL_SN: serialNum},{ URL: url });
                        break;
                    case 'project':
                        await db.TB_PJT.update({ PJT_IMG: url }, { where: { PJT_SN: serialNum } });
                        break;
                }
                return res.status(200).send('File uploaded successfully.');
            } catch (error) {
                console.error('Database update failed:', error);
                return error;
            }
        }).catch((error) => {
            console.error('Failed to upload the file:', error);
            return error;
        });
    }
}

module.exports = new minio();