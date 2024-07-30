const express = require('express');
const router = express.Router();
const statusService = require('./status.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const projectService = require("../project/project.service");
const profileService = require("../profile/profile.service");

// 내 현황 조회
router.get('/status', jwt.authenticateToken, async (req, res) => {
    const user = req.userSn.USER_SN;
    try {
        const statusList = await statusService.status(user);
        return res.status(200).json(statusList);
    } catch (error) {
        logger.error('현황 조회 중 에러 : ' + error);
        return res.status(400).send('현황 조회 중 에러 : ' + error);
    }
});
// 내 현황 조회
router.get('/status/user', jwt.authenticateToken, async (req, res) => {
    try {
        const status = await statusService.myStatus(req, res);
        res.status(200).send(status);
    } catch (error) {
        logger.error('프로젝트 현황 조회 중 에러 발생: ' + error.message);
        res.status(400).send('프로젝트 현황 조회 중 에러 발생: ' + error.message);
    }
})

// 내 프로젝트 현황 조회 
router.get('/status/myProject', jwt.authenticateToken, async (req, res) => {
    try {
        const status = await statusService.projectStatus(req, res);
        res.status(200).send(status);
    } catch (error) {
        logger.error('프로젝트 현황 조회 중 에러 발생: ' + error.message);
        res.status(400).send('프로젝트 현황 조회 중 에러 발생: ' + error.message);
    }
})

// 참여 요청 프로젝트 조회
router.get('/status/user/:pjtSn', jwt.authenticateToken, async (req, res) => {
    try {
        const pjtData = await statusService.reqProject(req, res);
        return res.status(200).send(pjtData);
    } catch (error) {
        logger.error(`요청된 프로젝트 조회 실패: ${error.message}`);
        return res.status(400).send(`요청된 프로젝트 조회 실패 :  ${error.message}`);
    }
})

router.get('/status/myProject/:pjtSn/:userSn', jwt.authenticateToken, async (req, res) => {
    try {
        const userData = await statusService.myData(req, res);
    } catch (error) {
        logger.error('프로필 및 포트폴리오 조회 실패', error.message);
        return res.status(400).send('프로필 및 포트폴리오 조회 실패  : ' + error.message);
    }
})

// 프로젝트 참여 요청 전송
router.post('/status/:pjtSn/req', jwt.authenticateToken, async (req, res) => {
    try {
        console.log("d")
        await statusService.reqUser(req, res);

        return res.status(200).send('회원에게 프로젝트 참여 요청 성공');

    } catch (error) {
        return res.status(400).send('프로젝트 참여 요청 전송 중 에러 발생: ' + error.message);
    }
})

// 프로젝트 참여요청 상태 변경
router.put('/status/:pjtSn/req/:reqSn', jwt.authenticateToken, async (req, res) => {
    try {
        await statusService.updateReq(req, res);
        return res.status(201).send('회원에게 프로젝트 참여 상태 수정 성공');

    } catch (error) {
        return res.status(400).send('프로젝트 참여 요청 수정 중 에러 발생: ' + error.message);
    }
})

module.exports = router;