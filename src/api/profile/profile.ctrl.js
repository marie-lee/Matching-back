const express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('../../utils/jwt/jwt');
const profileService = require('./profile.service');
const {logger} = require("../../utils/logger");


router.get('/profile', jwt.authenticateToken, async (req, res)=>{
    try {
        return await profileService.pfPfolSelect(req, res);
    } catch (error) {
        logger.error('내 프로필 및 포트폴리오 조회 실패', error);
        return res.status(400).send('내 프로필/포트폴리오 조회 중 에러 발생 에러 내용 : ' + error);
    }
})

router.post('/profile', jwt.authenticateToken, async (req, res)=>{
    try{
        await profileService.profileUpload(req, res);
    }
    catch (error){
        res.status(400).send('입력중 에러 발생 에러내용 : ' + error);
    }
});

module.exports = router;