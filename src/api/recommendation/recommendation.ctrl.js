const express = require('express');
const router = express.Router();
const recommendationService = require('./recommendation.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/recommendation/project/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    const pjt = req.params.pjtSn;
    const user = req.userSn.USER_SN;
    try{
        const matchingResult =  await recommendationService.selectMatchingData(user, pjt);
        res.status(200).json(matchingResult);
    }catch (error) {
        logger.error('매칭 - 추천 회원 프로필/포트폴리오 조회 실패', error);
        return res.status(400).json({message : '매칭 - 추천 회원 프로필/포트폴리오 조회 실패 : ' + error});
    }
});


module.exports = router;