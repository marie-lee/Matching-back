const express = require('express');
const router = express.Router();
const statusService = require('./status.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const MatchingReqDto = require("./dto/matching.req.dto");

// 내 현황 조회
router.get('/status', jwt.authenticateToken, async (req, res) => {
    const user = req.userSn.USER_SN;
    try {
        const statusList = await statusService.status(user);
        return res.status(200).json(statusList);
    } catch (error) {
        logger.error('현황 조회 중 에러 : ' + error);
        return res.status(400).json('현황 조회 중 에러 : ' + error);
    }
});

// 내 현황 조회
router.get('/status/user', jwt.authenticateToken, async (req, res) => {
        const user = req.userSn.USER_SN;
        try {
            const status = await statusService.myStatus(user);
            res.status(200).json(status);
        } catch (error) {
            logger.error('프로젝트 현황 조회 중 에러 발생: ' + error.message);
        res.status(400).json('프로젝트 현황 조회 중 에러 발생: ' + error.message);
    }
})

// 내 프로젝트 현황 조회
router.get('/status/myProject', jwt.authenticateToken, async (req, res) => {
    const user = req.userSn.USER_SN;
    try {
        const status = await statusService.projectStatus(user);
        res.status(200).json(status);
    } catch (error) {
        logger.error('프로젝트 현황 조회 중 에러 발생: ' + error.message);
        res.status(400).json({message :'프로젝트 현황 조회 중 에러 발생: ' + error.message});
    }
})


// 프로젝트 참여 요청 전송
router.post('/status/:pjtSn/req', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.body.userSn;
    const pjtRoleSn = req.body.pjtRoleSn;
    const reqDto = new MatchingReqDto({
        PJT_SN: pjtSn,
        USER_SN: userSn,
        PJT_ROLE_SN: pjtRoleSn,
        REQ_STTS: 'REQ'
    });
    reqDto.validate();
    try{
        const request = await statusService.reqUser(reqDto);
        if(request.message) return res.status(400).json({message: request.message});
        return res.status(200).json({message : '회원에게 프로젝트 참여 요청 성공'});

    } catch (error) {
        return res.status(400).json('프로젝트 참여 요청 전송 중 에러 발생: ' + error.message);
    }
})

// 프로젝트 참여요청 상태 변경
router.put('/status/:pjtSn/req/:reqSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const reqSn = req.params.reqSn;
    const reqStts = req.body.reqStts;
    const reqDto = new MatchingReqDto({
        PJT_SN: pjtSn,
        USER_SN: userSn,
        REQ_SN: reqSn,
        REQ_STTS: reqStts
    });
    reqDto.validate();
    try {
        const updateReq = await statusService.updateReq(reqDto);
        if(updateReq.message) return res.status(400).json({message: updateReq.message});
        return res.status(201).json('회원에게 프로젝트 참여 상태 수정 성공');

    } catch (error) {
        return res.status(400).json('프로젝트 참여 요청 수정 중 에러 발생: ' + error.message);
    }
})

// 참여 요청 프로젝트 조회
router.get('/status/user/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.userSn.USER_SN;
    try {
        const pjtData = await statusService.reqProject(userSn, pjtSn);
        return res.status(200).json(pjtData);
    } catch (error) {
        logger.error(`요청된 프로젝트 조회 실패: ${error.message}`);
        return res.status(400).json(`요청된 프로젝트 조회 실패 :  ${error.message}`);
    }
})

router.get('/status/myProject/:pjtSn/:userSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.params.userSn;
    try {
        const userData = await statusService.engineerData(userSn, pjtSn, res);
        if(userData.message) return res.status(400).json({message: userData.message});
        // 프로필포폴 코드
        return res.status(200).json(userData);
    } catch (error) {
        logger.error('프로필 및 포트폴리오 조회 실패', error.message);
        return res.status(400).json('프로필 및 포트폴리오 조회 실패  : ' + error.message);
    }
})

module.exports = router;
