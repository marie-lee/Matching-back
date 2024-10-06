const express = require('express');
const router = express.Router();
const alarmService = require('./alarm.service');
const jwt = require('../../utils/jwt/jwt');

const {logger} = require('../../utils/logger');

router.get('/alarm', jwt.authenticateToken, async (req, res) => {
    try {
        const userSn = req.userSn.USER_SN;
        const result = await alarmService.findAllAlarm(userSn);
        return res.status(200).json(result);

    }
    catch (e) {
        logger.error(`나에게 온 알림 조회 실패 : ${e}`);
        return res.status(400).json({status: 400 ,message: `나에게 온 알림 조회 실패 : ${e.message}`});
    }
});

router.patch('/alarm/all', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;

    try {
        const result = await alarmService.checkAllAlarm(userSn);
        if(result){
            return res.status(result.status).json(result);
        }
    }
    catch (e) {
        logger.error(`전체 알림 확인 처리 실패 : ${e}`);
        return res.status(400).json({status: 400 ,message: `전체 알림 확인 처리 실패 : ${e.message}`});
    }
});

router.delete('/alarm/all', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;

    try {
        const result = await alarmService.deleteAllCheckedAlarm(userSn);
        if(result){
            return res.status(result.status).json(result);
        }
    }
    catch (e) {
        logger.error(`확인된 알림 전체 삭제 실패 : ${e}`);
        return res.status(400).json({status: 400 ,message: `확인된 알림 전체 삭제 실패 : ${e.message}`});
    }
});

router.patch('/alarm/:alarmSn', jwt.authenticateToken, async (req, res) => {
    try {
        const userSn = req.userSn.USER_SN;
        const alarmSn = req.params.alarmSn;
        const result = await alarmService.checkAlarm(userSn, alarmSn);
        if(result){
            return res.status(result.status).json(result);
        }
    }
    catch (e) {
        logger.error(`알림 확인 처리 실패 : ${e}`);
        return res.status(400).json({status: 400 ,message: `알림 확인 처리 실패 : ${e.message}`});
    }
});

router.delete('/alarm/:alarmSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const alarmSn = req.params.alarmSn;

    try {
        const result = await alarmService.deleteAlarm(userSn, alarmSn);
        if(result){
            return res.status(result.status).json(result);
        }
    }
    catch (e) {
        logger.error(`알림 삭제 실패 : ${e}`);
        return res.status(400).json({status: 400 ,message: `알림 삭제 실패 : ${e.message}`});
    }
});

module.exports = router;