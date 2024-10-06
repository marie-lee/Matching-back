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

// 프로젝트 종료일 수정
router.put('/project/updateEndDate/:pjtSn', jwt.authenticateToken, async (req, res) => {
  const user = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  const endDate = req.body.endDate;
  try {
    const update = await projectService.updateEndDate(user, pjtSn, endDate);
    return res.status(200).json(update); // 성공 응답 반환
  } catch (error) {
    logger.error('프로젝트 종료일 수정 중 오류 발생: ', error);
    if (error.message.includes('권한이 없습니다.')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
});

// 프로젝트 종료일 수정
router.put('/project/updateProjectStatus/:pjtSn', jwt.authenticateToken, async (req, res) => {
  const user = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  const status = req.body.status;
  try {
    const update = await projectService.updateProjectStatus(user, pjtSn, status);
    return res.status(200).json(update); // 성공 응답 반환
  } catch (error) {
    logger.error('프로젝트 상태 수정 중 오류 발생: ', error);
    if (error.message.includes('권한이 없습니다.')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  }
});

//평가자 목록 조회
router.get('/project/rate/:pjtSn',jwt.authenticateToken,async(req,res)=>{
  const pjt = req.params.pjtSn;
  const user = req.userSn.USER_SN;
  try {
    const rateMemberList = await projectService.getRateMemberList(pjt, user);
    const projectInfo = await projectService.getProjectInfo(pjt, user);
    if (rateMemberList.length === 0) {
      return res.status(403).json({ message: '해당 프로젝트에 대한 접근 권한이 없습니다.' });
    }
    return res.status(200).json({
      projectInfo,
      rateMemberList
    });
  } catch (error) {
    logger.error('프로젝트 정보 및 평가자 목록 조회 실패:', error);
    return res.status(400).json('프로젝트 정보 및 평가자 목록 조회 실패: ' + error.message );
  }

});

// 평가하기
router.post('/project/rate/:pjtSn/:targetSn', jwt.authenticateToken, async (req, res) => {
  const { pjtSn, targetSn } = req.params;
  const userSn = req.userSn.USER_SN;
  const { RATE_1, RATE_2, RATE_3, RATE_4, RATE_5, RATE_TEXT } = req.body;

  try {
    const rateData = {
      PJT_SN: pjtSn,
      TARGET_SN: targetSn,
      RATER_SN: userSn,
      RATE_1,
      RATE_2,
      RATE_3,
      RATE_4,
      RATE_5,
      RATE_TEXT
    };

    const projectRateDto = new ProjectRateDto(rateData);
    projectRateDto.validate();

    const newRate = await projectService.rateMember(projectRateDto);
    return res.status(200).json({ message: '평가 성공', data: newRate });
  } catch (error) {
    logger.error('평가 실패:', error);
    return res.status(400).json({ message: '평가 실패: ' + error.message });
  }
});

//나에대한 평가조회
router.get('/project/myRate/:pjtSn', jwt.authenticateToken, async (req, res) => {
  const userSn = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  try {
    const myRates = await projectService.getMyRates(userSn,pjtSn);
    return res.status(200).json(myRates);
  } catch (error) {
    logger.error('나에 대한 평가 조회 실패:', error);
    return res.status(400).json('나에 대한 평가 조회 실패: ' + error.message);
  }
});

//기여도 계산
router.get('/project/contribution/:pjtSn',jwt.authenticateToken,async (req,res)=>{
  const pjtSn = req.params.pjtSn;
  try{
    const contributions = await projectService.calContribution(pjtSn);
    return res.status(200).json(contributions);
  }catch (error) {
    logger.error('기여도 계산 중 오류 발생:',error);
    return res.status(400).json('기여도 계산 중 오류 발생:'+error.message);
  }
});

//멤버 리스트 조회 owner
router.get('/project/memberList/:pjtSn', jwt.authenticateToken, async (req, res) => {
  const userSn = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  try {
    const members = await projectService.getProjectMemberList(userSn, pjtSn);
    if (members.message) {
      return res.status(403).json({ message: members.message });
    }
    return res.status(200).json(members);
  } catch (error) {
    logger.error('프로젝트 멤버 리스트 조회 실패: ', error);
    return res.status(400).json('프로젝트 멤버 리스트 조회 실패: ' + error.message);
  }
});
// 프로젝트 멤버 권한 변경
router.put('/project/memberList/role/:pjtSn/:memberSn', jwt.authenticateToken, async (req, res) => {
  const userSn = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  const memberSn = req.params.memberSn;
  const { newRole } = req.body;

  try {
    const result = await projectService.changeMemberRole(userSn, pjtSn, memberSn, newRole);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('프로젝트 멤버 권한 변경 실패: ', error);
    if (error.message === '권한이 없습니다.') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(400).json('프로젝트 멤버 권한 변경 실패: ' + error.message);
  }
});

// 프로젝트 멤버 역할 변경
router.put('/project/memberList/part/:pjtSn/:memberSn', jwt.authenticateToken, async (req, res) => {
  const userSn = req.userSn.USER_SN;
  const pjtSn = req.params.pjtSn;
  const memberSn = req.params.memberSn;
  const { newPart } = req.body;

  try {
    const result = await projectService.changeMemberPart(userSn, pjtSn, memberSn, newPart);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('프로젝트 멤버 역할 변경 실패: ', error);
    if (error.message === '권한이 없습니다.') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(400).json('프로젝트 멤버 역할 변경 실패: ' + error.message);
  }
});
module.exports = router;
