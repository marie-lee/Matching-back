const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {oneCmmnVal} = require("../common/common.repository");

const profileService = require("../profile/profile.service");
const projectRepository = require("../project/project.repository");
const statusRepository = require("./status.repository");

class statusService {
  async status(user) {
    let jsonData = {
      myReqList: [],
      projectReqList: []
    };
    try {
      jsonData.myReqList = await this.myReqList(user);
      const myProjects = await projectRepository.myCreatedProjectList(user);
      for (const project of myProjects) {
        const projectReq = await this.projectReqList(project);
        jsonData.projectReqList.push(projectReq);
      }

      return jsonData
    } catch (error) {
      throw error;
    }
  }

  async myStatus(user) {
    try {
      const statusList = await statusRepository.myReqList(user);
      for (const status of statusList){
        const stts = await oneCmmnVal('REQ_STTS', status.dataValues.reqStts);
        const {reqStts, ...rest} = status.dataValues;
        status.dataValues = {
          ...rest,
          reqSttsCd: reqStts,
          reqStts: stts.dataValues.CMMN_CD_VAL
        }
      }
      return statusList;
    } catch (error) {
      throw error;
    }
  }

  async projectStatus(user) {
    try{
      const statusList = await statusRepository.projectReqList(user);
      // 결과 배열을 변환합니다.
      const result = statusList.map(pjt => ({
        pjtSn: pjt.dataValues.pjtSn,
        pjtNm: pjt.dataValues.pjtNm,
        pjtOpenYn: pjt.dataValues.pjtOpenYn,
        reqList: pjt.tr.map(req => ({
          reqSn: req.dataValues.reqSn,
          userSn: req.tu.dataValues.userSn,
          userNm: req.tu.dataValues.userNm,
          userImg: req.tu.dataValues.userImg,
          part: req.tpr.dataValues.part,
          reqStts: req.dataValues.reqStts,
        })),
      }));
      for (const pjt of result) {
        for (let status of pjt.reqList) {
          const stts = await oneCmmnVal('REQ_STTS', status.reqStts);
          status.reqSttsCd = status.reqStts;
          if(stts) status.reqStts = stts.CMMN_CD_VAL;
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  }


  async reqProject(userSn, pjtSn) {
    try {
      const req = await statusRepository.findRequest(pjtSn, userSn);
      if(req){ return {message : '해당 프로젝트 참여요청 내역이 없습니다.'}; }

      const pjt = await projectRepository.getProjectIntro(pjtSn);
      if(!pjt){ return {message : '프로젝트가 존재하지 않거나 권한이 없습니다.'}; }

      return pjt;
    } catch (error) {
      throw error;
    }
  }

  async engineerData(userSn, pjtSn, res){
    try{
      const mem = await statusRepository.findRequest(userSn, pjtSn);
      if(!mem) return {message : '프로젝트 참여요청 내역이 없습니다.'};
      // profile부분과 연결
      return await profileService.pfPfolSelect(userSn, res)
    } catch (error){
      throw error
    }

  }

  async reqUser(reqDto) {
    const transaction = await db.transaction();
    try {
      const  reqMem = await statusRepository.findRequest(reqDto.USER_SN, reqDto.PJT_SN)
      if (reqMem) return { message : '이미 요청된 회원입니다.'};

      const pr = await statusRepository.findProjectRole(reqDto.PJT_SN, reqDto.PJT_ROLE_SN);
      if (!pr) return {message :'없는 프로젝트 파트입니다.'}
      if (pr.TOTAL_CNT === pr.CNT) return {message : '파트 인원이 모두 찼습니다.'}

      const request = await statusRepository.createRequest(reqDto, transaction)
      await transaction.commit();
      return request;
    } catch (error) {
      await transaction.rollback();
      logger.error('프로젝트 참여 요청 중 에러 발생: ', error.message);
      throw error;
    }
  }

  async updateReq(reqDto) {
    const transaction = await db.transaction();
    const {PJT_SN, USER_SN, REQ_STTS, REQ_SN} = reqDto
    try {
      let reqMem = await statusRepository.findReqMem(PJT_SN, REQ_SN);
      if (!reqMem) return {message : '수정할 회원이 없습니다.'};
      let pr = await statusRepository.findProjectRole(PJT_SN, reqMem.PJT_ROLE_SN)
      if (pr.TOTAL_CNT === pr.CNT) return {message : '파트 인원이 모두 찼습니다.'};
      console.log(pr)
      let mem = await projectRepository.pjtRoleMem(
          {PJT_SN: PJT_SN, USER_SN: reqMem.USER_SN, PJT_ROLE_SN: reqMem.PJT_ROLE_SN}
      );
      if (mem) return {message : '이미 프로젝트에 참가 중 입니다.'};

      if (REQ_STTS === 'CONFIRM' || REQ_STTS === 'CANCEL' || REQ_STTS === 'REJECT') {
        reqMem.FINISHIED_DT = new Date();
        reqMem.DEL_YN = true;
      }
      reqMem.REQ_STTS = REQ_STTS;
      const updateReq = await statusRepository.updateRequest(reqMem,transaction);

      if (reqMem.REQ_STTS === 'CONFIRM') {
        await pr.increment('CNT', {by: 1, transaction});
        const pm = {PJT_SN: reqMem.PJT_SN, USER_SN: reqMem.USER_SN, PJT_ROLE_SN: reqMem.PJT_ROLE_SN};
        await projectRepository.createProjectMember(pm, {transaction});
      }

      const pra = await statusRepository.findAllProjectRole(PJT_SN);
      let allEqual = null
      if(pra){
        allEqual = pra.every(item => item.TOTAL_CNT === item.CNT);
      }
      if(allEqual){
        await statusRepository.updateProjectStatus(PJT_SN, 'PROGRESS');
      }
      await transaction.commit();
      return updateReq
    } catch (error) {
      await transaction.rollback();
      logger.error(error.message);
      throw error;
    }
  }

  async projectReqList(pjt) {
    let REQ = {};
    try {
      REQ.PJT_SN = pjt.PJT_SN;
      REQ.PJT_NM = pjt.PJT_NM;

      REQ.REQ_LIST = await statusRepository.projectRequestList(pjt.PJT_SN);
      return REQ;
    } catch (error) {
      throw error;
    }
  }

  async myReqList(userSn) {
    try{
        return await statusRepository.myRequestList(userSn);
    } catch (error) {
        logger.error(error.message);
        throw error;
    }
  }
}

module.exports = new statusService();