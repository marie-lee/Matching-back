const express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('../../utils/jwt/jwt');
const profileService = require('./profile.service');
const {logger} = require("../../utils/logger");


router.get('/profile', jwt.authenticateToken, async (req, res)=>{
    try {
        const userSn = req.userSn.USER_SN;
        return await profileService.pfPfolSelect(userSn, res);
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
        logger.error('입력중 에러 발생 에러내용', error);
        return res.status(400).send('입력중 에러 발생 에러내용 : ' + error);
    }
});

router.put('/profile', jwt.authenticateToken, async (req, res) => {
  try {
    await profileService.profileModify(req, res);
  } catch (error) {
    logger.error('수정중 에러 발생 에러내용', error);
    return res.status(400).send('수정중 에러 발생 에러내용 : ' + error);
  }
});

router.get('/profile/:pfolSn', jwt.authenticateToken, async (req, res)=>{
  try {
    const userSn = req.userSn.USER_SN;
    const pfolSn = req.params.pfolSn;
    const portfolioDetail = await profileService.portfolioDetailSelect(userSn,pfolSn);
    return res.status(200).send(portfolioDetail);
  } catch (error) {
    logger.error('포트폴리오 상세 조회 중 에러 발생', error);
    return res.status(400).send('포트폴리오 상세 조회 중 에러 발생: ' + error.message);
  }
});

module.exports = router;
