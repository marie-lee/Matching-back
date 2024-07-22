const express = require('express');
const router = express.Router();
const projectService = require('./project.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/project/all', async (req, res) => {
    try {
        const pjt = await projectService.allProject(req, res);
        return res.status(200).send(pjt);

    } catch (error) {
        logger.error('프로젝트 리스트 전체 조회 실패', error);
        return res.status(400).send('프로젝트 전체 조회 실패 : ' + error);
    }
});

router.get('/project', jwt.authenticateToken, async (req, res) => {
    try {
      const userSn = req.userSn.USER_SN;
      const myProjects = await projectService.myProjects(userSn);
      return res.status(200).send(myProjects);
    } catch (error) {
        logger.error('내 프로젝트 리스트 조회 실패', error);
        return res.status(400).send('내 프로젝트 리스트 조회 실패 : ' + error);
    }
});

router.get('/project/:pjtSn', jwt.authenticateToken, async (req, res) => {
    try {
        const userSn = req.userSn.USER_SN;
        const pjtSn = req.params.pjtSn;
        const pjtData = await projectService.myProject(userSn, pjtSn);
        return res.status(200).send(pjtData);
    } catch (error) {
        logger.error(`내 프로젝트 조회 실패: ${error}`);
        return res.status(400).send(`내 프로젝트 조회 실패 :  ${error}`);
    }
})

router.post('/project/add', jwt.authenticateToken, async (req, res) => {
    try {
        const newProject = await projectService.registerProject(req, res);
        res.status(200).send('프로젝트 등록 성공')
        setImmediate(async () => {
            try {
                await projectService.toVectorPjt(req.userSn.USER_SN, newProject);
            } catch (error) {
                logger.error('추가 작업 중 에러: ' + error.message);
            }
        })
    } catch (error) {
        logger.error('프로젝트 등록 실패:', error);
        return res.status(400).send('프로젝트 등록 중 에러 발생 에러내용: ' + error.message);
    }
});

router.get('/project/member/:pjtSn', jwt.authenticateToken, async (req, res) => {
    try {
        const memberList = await projectService.getProjectMember(req, res);
        return res.status(200).send(memberList);
    } catch (error) {
        logger.error('프로젝트 멤버 리스트 조회 실패: ', error);
        return res.status(400).send('프로젝트 멤버 리스트 조회 실패: ' + error.message)
    }
});

router.get('/project/wbs/template', jwt.authenticateToken, async (req, res) => {
  try {
    const template = await projectService.getWbsTemplate();
    return res.status(200).send(template);
  } catch (error) {
    logger.error('WBS 템플릿 조회 중 오류 발생: ', error);
    return res.status(400).send('WBS 템플릿 조회 중 오류 발생: ' + error.message);
  }
});

router.post('/project/wbs/create/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const pjtData = req.body.pjtData;
    const memberData = req.body.memberData;
    const wbsData = req.body.wbsData;
    try{
        await projectService.createWbs(userSn, pjtSn, pjtData, memberData, wbsData);
        return res.status(200).send('프로젝트 WBS 생성 성공');
    }
    catch (e){
        return res.status(400).send('프로젝트 WBS 생성 실패 error = ' + e.message);
    }
});

router.get('/project/wbs/create/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    try{
        const data = await projectService.createWbsInfo(userSn, pjtSn);

        if(data != null){
            return res.status(200).json(data);
        }
        else{
            return res.status(400).send('조회 실패');
        }
    }
    catch (e){
        return res.status(403).send(e.message);
    }
});

router.post('/project/wbs/edit/:pjtSn', jwt.authenticateToken, async (req,res) =>{
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const data = req.body;
    try {
        if(projectService.editWbs(userSn, pjtSn, data)){
            res.status(200).send('WBS 수정 완료.');
        }
    }
    catch (e) {
        return res.status(400).send('WBS 수정 중 오류 발생 error : '+e.message)
    }
})

router.get('/project/wbs/:pjtSn', jwt.authenticateToken, async (req, res)=> {
    try{
        const data = await projectService.getWbs(req, res);
        if(data != null){ return res.status(200).json(data); }
        else { return res.status(400).send('조회되는 WBS가 없습니다.'); }
    } catch (error){
        return res.status(400).send(`WBS 조회 중 에러 발생 :  ${error.message}`);
    }
})

module.exports = router;
