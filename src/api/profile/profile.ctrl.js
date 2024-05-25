const express = require('express');
const router = express.Router();
require('dotenv').config();
const multer = require('multer');
const jwt = require('../../utils/jwt/jwt');
const profileService = require('./profile.service');

const upload = multer();

router.post('/profile', jwt.authenticateToken, upload.any(), async (req, res)=>{
    const data = JSON.parse(req.body.data);
    try{
        await profileService.profileUpload(req, res, data);
    }
    catch (error){
        res.status(400).send('입력중 에러 발생 에러내용 : ' + error);
    }
});

module.exports = router;