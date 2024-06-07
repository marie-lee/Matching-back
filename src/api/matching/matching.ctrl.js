const express = require('express');
const router = express.Router();
const matchingService = require('./matching.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/matching/member/:pjtSn', async (req, res)=>{
    try{
        return await matchingService.selectMatchingData(req, res);
    }catch (error) {
        logger.error('내 프로젝트 리스트 조회 실패', error);
        return res.status(400).send('내 프로젝트 리스트 조회 실패 : ' + error);
    }
});

router.get('/matching/memberData', async (req, res)=>{
    try{
        return await matchingService.selectMemberData(req, res);
    }catch (error) {
        logger.error('회원 프로필 포트폴리오 조회 실패', error);
        return res.status(400).send('회원 프로필 포트폴리오 조회 실패 : ' + error);
    }
})



module.exports = router;