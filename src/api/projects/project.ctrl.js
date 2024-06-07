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

router.get('/project/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    try{
        const pjtData = await projectService.myProject(req, res);
        return res.status(200).send(pjtData);
    }catch (error) {
        logger.error(`내 프로젝트 조회 실패: ${error}`);
        return res.status(400).send(`내 프로젝트 조회 실패 :  ${error}`);
    }
})

router.post('/project/add', jwt.authenticateToken, async (req, res) => {
  try {
    const newProject = await projectService.registerProject(req.body, req.userSn);
    res.status(200).send('프로젝트 등록 성공');
  } catch (error) {
    logger.error('프로젝트 등록 실패:', error);
    return res.status(400).send('프로젝트 등록 중 에러 발생 에러내용: ' + error.message);
  }
});


module.exports = router;
