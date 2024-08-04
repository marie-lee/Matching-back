const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectService = require('./project.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const ProjectCreateDto = require("./dto/project.create.dto");
const ProjectRateDto = require("./dto/project.rate.dto");
const db = require("../../config/db/db");
const upload = multer();

router.get('/project/all', async (req,res) => {
    try {
        const pjt = await projectService.allProject();
        return res.status(200).json(pjt);

    } catch (error) {
        logger.error('프로젝트 리스트 전체 조회 실패', error);
        return res.status(400).json({message : '프로젝트 전체 조회 실패 : ' + error});
    }
});

// 내가 생성헌 프로젝트 리스트 조회
router.get('/project', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    try {
        const myProjects = await projectService.myProjects(userSn);
        return res.status(200).json(myProjects);
    } catch (error) {
        logger.error('내 프로젝트 리스트 조회 실패', error);
        return res.status(400).json('내 프로젝트 리스트 조회 실패 : ' + error);
    }
});

// 내가 참여한 프로젝트 상세 조회
router.get('/project/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    try {
        const pjtData = await projectService.myProject(userSn, pjtSn);
        if(pjtData.message){ return res.status(400).json({message : pjtData.message}); }
        return res.status(200).json(pjtData);
    } catch (error) {
        logger.error(`내 프로젝트 조회 실패: ${error}`);
        return res.status(400).json({message:`내 프로젝트 조회 실패 :  ${error}`});
    }
})

// 프로젝트 추가
router.post('/project/add', jwt.authenticateToken, upload.single('PJT_IMG'), async (req, res) => {
    try {

        const projectData = req.body;
        const userSn = req.userSn.USER_SN;
        const img = req.file;

        const projectCreateDto = new ProjectCreateDto(projectData);
        projectCreateDto.validate();

        const newProject = await projectService.registerProject(projectCreateDto, userSn, img);

        res.status(200).json({ message: '프로젝트 등록 성공' });

        setImmediate(async () => {
            try {
                await projectService.toVectorPjt(userSn, newProject);
            } catch (error) {
                logger.error('추가 작업 중 에러: ' + error.message);
            }
        })
    } catch (error) {
        logger.error('프로젝트 등록 실패:', error);
        return res.status(400).json({message: '프로젝트 등록 중 에러 발생 에러내용: ' + error.message});
    }
});

// 프로젝트 멤버 리스트 조회
router.get('/project/member/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const user = req.userSn.USER_SN;
    const pjt = req.params.pjtSn;
    try {
        const members = await projectService.getProjectMember(user, pjt);
        if (members.message) {
            return res.status(200).json(members.message);
        }
        return res.status(200).json(members);
    } catch (error) {
        logger.error('프로젝트 멤버 리스트 조회 실패: ', error);
        return res.status(400).json('프로젝트 멤버 리스트 조회 실패: ' + error.message)
    }
});

//평가자 목록 조회
router.get('/project/rate/:pjtSn',jwt.authenticateToken,async(req,res)=>{
  const pjt = req.params.pjtSn;
  const user = req.userSn.USER_SN;
  try {
    const rateMemberList = await projectService.getRateMemberList(pjt, user);
    if (rateMemberList.length === 0) {
      return res.status(403).json({ message: '해당 프로젝트에 대한 접근 권한이 없습니다.' });
    }
    return res.status(200).json(rateMemberList);
  } catch (error) {
    logger.error('평가자 목록 조회 실패:', error);
    return res.status(400).json('평가자 목록 조회 실패: ' + error.message );
  }

});

//평가하기
router.post('/project/rate/:pjtSn/:targetSn',jwt.authenticateToken,async(req,res)=>{
  const {pjtSn, targetSn} = req.params;
  const userSn = req.userSn.USER_SN;
  const rateData = req.body;
  try {
    const rateMember = await projectService.rateMember(userSn, pjtSn, targetSn, rateData);
    return res.status(200).json({ message: '평가 성공', data: rateMember });
  } catch (error) {
    logger.error('평가 실패:', error);
    return res.status(400).json({ message: '평가 실패: ' + error.message });
  }
});
module.exports = router;
