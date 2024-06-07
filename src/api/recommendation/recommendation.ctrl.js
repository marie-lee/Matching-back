const express = require('express');
const router = express.Router();
const recommendationService = require('./recommendation.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/recommendation/project/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    try{
        return await recommendationService.selectMatchingData(req, res);
    }catch (error) {
        logger.error('매칭 - 추천 회원 프로필/포트폴리오 조회 실패', error);
        return res.status(400).send('매칭 - 추천 회원 프로필/포트폴리오 조회 실패 : ' + error);
    }
});

router.get('/recommendation/memberData', async (req, res)=>{
    try{
        return await recommendationService.selectMemberData(req, res);
    }catch (error) {
        logger.error('회원 프로필 포트폴리오 조회 실패', error);
        return res.status(400).send('회원 프로필 포트폴리오 조회 실패 : ' + error);
    }
})




module.exports = router;