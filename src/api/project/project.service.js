const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");

const projectRepository = require("./project.repository");
const minioService = require('../../middleware/minio/minio.service');

const {runPjtToVec} = require("../../utils/matching/spawnVectorization");
const {throwError} = require("../../utils/errors");
const commonRepository = require("../common/common.repository");
const {transport} = require("winston");


class projectService {
  async myProject(userSn, pjtSn) {
    try {
      const pjtMem = await projectRepository.findProjectMember(pjtSn, userSn);

      if (!pjtMem) {
        return {message:'프로젝트 참여 멤버가 아닙니다.'};
      }
      const project = await projectRepository.getProjectIntro(pjtSn);
      if (!project) {
        return {message:'해당 프로젝트를 찾을 수 없습니다.'};
      }
      const sttsVal = await commonRepository.oneCmmnVal('PJT_STTS', project.dataValues.pjtStts);
      const { pjtStts, ...rest } = project.dataValues;
      return {
        ...rest,
        pjtSttsCd: pjtStts,
        pjtStts: sttsVal.dataValues.CMMN_CD_VAL
      };

    } catch (error) {
      logger.error("내 단일 포르젝트 조회 실패", error)
      throw error;
    }
  }

  async myProjects(userSn) {
    try {
      return await projectRepository.getMyProjects(userSn)
    } catch (error) {
      logger.error('내 프로젝트 리스트 조회 중 에러 발생:', error);
      throw error;
    }
  }

  async allProject(){
    try {
      return await projectRepository.getAllProjects();
    } catch (error) {
      throw error;
    }
  };

  async getProjectMember(user, pjt) {
    try {
      const memList = await projectRepository.findProjectMembers(user, pjt);

      if (!memList || memList.length === 0) {
        return {message: '프로젝트 멤버가 존재하지 않습니다.'};
      }
      return memList;
    } catch (error) {
      logger.error('프로젝트 멤버 조회 중 오류 발생:', error);
      throw error;
    }
  }

  // 프로젝트 등록
  async registerProject(projectCreateDto, user, file) {
    const transaction = await db.transaction();
    try {
      const {
        PJT_NM,
        PJT_IMG,
        PJT_INTRO,
        CONSTRUCTOR_ROLE,
        SELECTED_DT_YN,
        START_DT,
        PERIOD,
        DURATION_UNIT,
        STACKS,
        WANTED,
        PJT_DETAIL,
        ROLES
      } = projectCreateDto;

      // 프로젝트 생성
      const newProject = await projectRepository.createProject({
        PJT_NM,
        PJT_IMG,
        PJT_INTRO,
        CREATED_USER_SN: user,
        CONSTRUCTOR_ROLE,
        SELECTED_DT_YN,
        START_DT,
        PERIOD,
        DURATION_UNIT,
        WANTED,
        PJT_DETAIL,
        PJT_STTS: "RECRUIT"
      }, transaction);

      // 스택 처리
      for (const stack of JSON.parse(STACKS)) {
        const [st] = await projectRepository.findOrCreateStack(stack.ST_NM.toLowerCase(), transaction);
        await projectRepository.createProjectSkill({PJT_SN: newProject.PJT_SN, ST_SN: st.ST_SN}, transaction);
      }

      // 팀원
      for (const role of JSON.parse(ROLES)) {
        await projectRepository.createProjectRole({
          PJT_SN: newProject.PJT_SN,
          PART: role.PART.toLowerCase(),
          TOTAL_CNT: role.TOTAL_CNT,
          CNT: 0 // 현재 참여자 수를 기본값 0으로 설정
        }, transaction);
      }

      // 생성자 멤버추가
      const [constructorRole, created] = await projectRepository.findOrCreateProjectRole({
        PJT_SN: newProject.PJT_SN,
        PART: CONSTRUCTOR_ROLE.toLowerCase(),
        TOTAL_CNT: 1,
        CNT: 1
      }, transaction);

      if (!created) {
        constructorRole.TOTAL_CNT += 1;
        constructorRole.CNT += 1;
        await projectRepository.updateProjectRole(constructorRole, transaction);
      }
      await projectRepository.createProjectMember({
        PJT_SN: newProject.PJT_SN, USER_SN: user, PJT_ROLE_SN: constructorRole.PJT_ROLE_SN
      }, transaction);

      if (file) {
        const type = 'project';
        const serialNum = newProject.PJT_SN;
        await minioService.upload(file, 'project', serialNum, transaction);
      }

      await transaction.commit();

      return newProject.PJT_SN;
    } catch (error) {
      logger.error('프로젝트 등록 중 오류 발생:', error);
      await transaction.rollback();
      throw error;
    }
  }

  async toVectorPjt(userSn, pjtSn) {
    try {
      const pjtData = await this.myProject(userSn, pjtSn);
      const cleanedPjtDetail = pjtData.dataValues.pjtDetail.replace(/\r\n/g, ' ');
      pjtData.dataValues.pjtDetail = cleanedPjtDetail;
      console.log(pjtData.dataValues.pjtDetail)

      const pjtJson = JSON.stringify(pjtData);
      await runPjtToVec(pjtJson).then(() => {
        console.log("프로젝트 벡터화 완료")
      })
    } catch (error) {
      logger.error(error)
      throw Error("프로젝트 데이터 벡터화 처리 중 에러 발생: ", error);
    }
  }

  async createWbs(userSn, pjtSn, pjtData, memberData, wbsData){
    const t = await db.transaction();

    let depth1Count = 1;
    let depth2Count = 1;

    try {
      if(!await db.TB_WBS.findOne({where:{PJT_SN: pjtSn, PARENT_SN: null, ORDER_NUM: 1, DEL_YN: false}})){
        // 시작일 종료일 설정
        await db.TB_PJT.update(
            {START_DT: pjtData.START_DT, END_DT: pjtData.END_DT},
            {where:{PJT_SN: pjtSn},
              transaction: t
            });

        // 멤버 권한, 담당 설정
        for (const member of memberData){
          await db.TB_PJT_M.update(
              {ROLE: member.ROLE, PART: member.PART},
              {where:{PJT_SN: pjtSn, USER_SN: member.USER_SN},
                transaction: t}
          );
        }

        // WBS 생성
        for(const depth1 of wbsData){
          // depth1 생성
          const depth1Data = await db.TB_WBS.create({
                PJT_SN: pjtSn, TICKET_NAME: depth1.name, ORDER_NUM: depth1Count},
              {transaction: t});
          depth2Count = 1;

          for(const depth2 of depth1.child){
            await this.insertWbs(depth2, pjtSn, depth1Data.TICKET_SN, depth2Count, t);
            depth2Count++;
          }
          depth1Count++;
        }
      }
      else{
        new Error('WBS가 존재합니다.');
      }

      await t.commit();
      return true;
    }
    catch (e){
      await t.rollback();
      logger.error('WBS 생성중 오류 발생 error : ', e);
      throw e;
    }
  }

  async insertWbs(depth, pjtSn, parentSn, depthCount, transaction){
    let depth2Count = 1;
    // 하위 목록이 있다면
    if(depth.child){
      const depthData = await db.TB_WBS.create({
            PJT_SN: pjtSn, TICKET_NAME: depth.name,
            PARENT_SN: parentSn ,ORDER_NUM: depthCount},
          {transaction: transaction});
      for(const depth2 of depth.child){
        await this.insertWbs(depth2, pjtSn, depthData.TICKET_SN, depth2Count, transaction);
        depth2Count++;
      }
    }
    // 하위 목록이 없다면
    else {
      await db.TB_WBS.create({
            PJT_SN: pjtSn, TICKET_NAME: depth.name, WORKER: depth.data.WORKER, START_DT: depth.data.START_DT,
            END_DT: depth.data.END_DT, STATUS: depth.data.STATUS,
            PARENT_SN: parentSn ,ORDER_NUM: depthCount},
          {transaction: transaction});
    }
  }

  async createWbsInfo(userSn, pjtSn){
    const pjt = await db.TB_PJT.findOne({where:{PJT_SN: pjtSn}});
    if(userSn !== pjt.CREATED_USER_SN){
      throw new Error('프로젝트 생성자가 아닙니다.');
    }
    const pjtData = {
      START_DT: pjt.START_DT,
      END_DT: pjt.END_DT
    };
    const members = await  db.TB_PJT_M.findAll({where:{PJT_SN: pjtSn, DEL_YN: false}});
    let memberData = [];


    for(const member of members){
      const user = await  db.TB_USER.findOne({where: {USER_SN: member.USER_SN, DEL_YN: false}});
      const part = await  db.TB_PJT_ROLE.findOne({where: {PJT_ROLE_SN: member.PJT_ROLE_SN, DEL_YN: false}});
      const userData = {
        USER_IMG: user.USER_IMG,
        USER_SN: user.USER_SN,
        USER_NM: user.USER_NM,
        PART: part.PART};
      memberData.push(userData);
    }

    return {
      pjtData: pjtData,
      memberData: memberData
    };
  }

  async editWbs(userSn, pjtSn, data){
    const t = await db.transaction();
    try {
      if (!await db.TB_WBS.findOne({where: {PJT_SN: pjtSn, PARENT_SN: null, ORDER_NUM: 1, DEL_YN: false}})) {
        throw new Error('WBS가 존재하지 않습니다.');
      } else {
        // 템플릿 데이터 입력
        await db.TB_WBS.update(
            {LAST_UPDATER: userSn, TEMPLATE_DATA: JSON.stringify(data[0].TEMPLATE_DATA)},
            {
              where: {PJT_SN: pjtSn},
              transaction: t
            }
        )
      }
      await t.commit();
      return true;
    }
    catch (e) {
      await t.rollback();
      logger.error('WBS 수정 중 오류 발생 error : ', e);
      throw e;
    }
  }

  async getRateMemberList(pjtSn,userSn){
    try{
      const rateMemberList = await projectRepository.findRateMember(pjtSn,userSn);
      return rateMemberList;
    }catch (error){
      logger.error('평가자 목록 조회 중 오류 발생:',error);
      throw error;
    }
  }
  async getProjectInfo(pjtSn,userSn){
    try{
      const projectInfo = await projectRepository.getProjectInfo(pjtSn,userSn);
      return projectInfo;
    }catch (error){
      logger.error('프로젝트 정보 조회 중 오류 발생:',error);
      throw error;
    }
  }

  async rateMember(rateData) {
    const transaction = await db.transaction();
    try {
      const { PJT_SN, TARGET_SN, RATER_SN, RATE_1, RATE_2, RATE_3, RATE_4, RATE_5, RATE_TEXT } = rateData;
      const existingRate = await projectRepository.findExistingRate(PJT_SN, TARGET_SN, RATER_SN);
      if (existingRate) {
        throw new Error('이미 평가한 멤버입니다.');
      }
      const newRate = await projectRepository.rateMember({
        PJT_SN,
        TARGET_SN,
        RATER_SN,
        RATE_1,
        RATE_2,
        RATE_3,
        RATE_4,
        RATE_5,
        RATE_TEXT
      }, transaction);

      await transaction.commit();
      return newRate;
    } catch (error) {
      logger.error('평가 중 오류 발생:', error);
      await transaction.rollback();
      throw error;
    }
  }


  async getMyRates(userSn,pjtSn) {
    try {
      const myRates = await projectRepository.findMyRates(userSn,pjtSn);
      return myRates;
    } catch (error) {
      logger.error('나에 대한 평가 조회 중 오류 발생:', error);
      throw error;
    }
  }

  async calContribution(pjtSn) {
    const transaction = await db.transaction();
    try {
      const projectMember = await projectRepository.findProjectMembersByProject(pjtSn);
      const existingContribution = projectMember.every(member => member.CONTRIBUTION !== 0);

      if (existingContribution) {
        throw new Error ('이미 기여도 계산이 완료되었습니다.');
      }

      const allWbsTickets = await projectRepository.findWbsTicketsByProject(pjtSn);

      const allTasksClosed = allWbsTickets.every(item => item.STATUS === 'TICKET_CLS');
      if (!allTasksClosed) {
        throw new Error ('모든 업무가 완료되지 않았습니다. 기여도 계산을 진행할 수 없습니다.');
      }

      const workerData = {};
      const totalTasks = allWbsTickets.length;
      const totalDifficulty = allWbsTickets.reduce((acc, item) => acc +
        (item.LEVEL === 'TICKET_HIGH' ? 12 : item.LEVEL === 'TICKET_MEDIUM' ? 5 : item.LEVEL === 'TICKET_LOW' ? 2 : 0), 0);

      if (totalTasks === 0 || totalDifficulty === 0) {
        throw new Error ('유효한 작업 또는 난이도가 없습니다. 기여도 계산을 진행할 수 없습니다.');
      }

      allWbsTickets.forEach(item => {
        if (!workerData[item.WORKER]) {
          workerData[item.WORKER] = {
            taskCount: 0,
            totalDifficulty: 0,
            totalDelay: 0
          };
        }
        workerData[item.WORKER].taskCount += 1;
        workerData[item.WORKER].totalDifficulty += item.LEVEL === 'TICKET_HIGH' ? 12 : item.LEVEL === 'TICKET_MEDIUM' ? 5 : item.LEVEL === 'TICKET_LOW' ? 2 : 0;

        const endDt = new Date(item.END_DT);
        const cpltDt = new Date(item.CPLT_DT);
        const delay = isNaN(cpltDt) || isNaN(endDt) ? 0 : Math.max(0, (cpltDt - endDt) / (1000 * 60 * 60 * 24));
        workerData[item.WORKER].totalDelay += delay;
      });

      let totalContribution = 0;
      const contributions = {};

      for (const worker in workerData) {
        const task = workerData[worker].taskCount / totalTasks;
        const difficulty = workerData[worker].totalDifficulty / totalDifficulty;
        const delay = (100 - workerData[worker].totalDelay) / 100;

        const contribution = (task * 0.4) * (difficulty * 0.4) * (delay * 0.2);

        if (isNaN(contribution) || !isFinite(contribution)) {
          contributions[worker] = 0;
        } else {
          contributions[worker] = contribution;
        }

        totalContribution += contributions[worker];
      }


      for (const worker in contributions) {
        const adjustedContribution = (totalContribution > 0) ? (contributions[worker] / totalContribution) * 100 : 0;
        await projectRepository.updateContribution(pjtSn, worker, adjustedContribution, transaction);
      }

      await transaction.commit();
      return { message: '기여도 계산 완료' };
    } catch (error) {
      await transaction.rollback();
      logger.error('기여도 계산 중 오류 발생:', error);
      throw error;
    }
  }
}
module.exports = new projectService();
