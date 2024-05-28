const express = require('express');
const router = express.Router();
const projectService = require('./project.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/project', jwt.authenticateToken, async (req, res)=>{
    try{
        return await projectService.myProjects(req, res);
    }catch (error) {
        logger.error('내 프로젝트 리스트 조회 실패', error);
        return res.status(400).send('내 프로젝트 리스트 조회 실패 : ' + error);
    }
});

module.exports = router;