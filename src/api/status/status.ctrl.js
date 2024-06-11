const express = require('express');
const router = express.Router();
const statusService = require('./status.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const projectService = require("../projects/project.service");

router.get('/status', jwt.authenticateToken, async (req, res) => {
   try{
       return await statusService.status(req, res);
   }
   catch (error) {
       logger.error('현황 조회 중 에러 : '+error);
       return res.status(400).send('현황 조회 중 에러 : '+error);
   }
});

router.get('/status/:pjtSn',jwt.authenticateToken, async (req, res) => {
    try{
        const userSn = req.userSn.USER_SN;
        const pjtSn = req.params.pjtSn;
        const pjtData = await projectService.reqProject(userSn, pjtSn);
        return res.status(200).send(pjtData[0]);
    }catch (error) {
        logger.error(`내 프로젝트 조회 실패: ${error}`);
        return res.status(400).send(`내 프로젝트 조회 실패 :  ${error}`);
    }
})

module.exports = router;