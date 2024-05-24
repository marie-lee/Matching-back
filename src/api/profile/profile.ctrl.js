const express = require('express');
const router = express.Router();
require('dotenv').config();
const multer = require('multer');
const jwt = require('../../utils/jwt/jwt');
const profileService = require('./profile.service');
const { json } = require('body-parser');

const upload = multer();

router.post('/profile', jwt.authenticateToken, async (req, res)=>{
    try{
        await profileService.profileUpload(req, res);
    }
    catch (error){
        res.status(400).send('입력중 에러 발생 에러내용 : ' + error);
    }
});

module.exports = router;