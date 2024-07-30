const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");

const projectRepository = require("./project.repository");
const minioService = require('../../middleware/minio/minio.service');

const {runPjtToVec} = require("../../utils/matching/spawnVectorization");
const {throwError} = require("../../utils/errors");
const oneCmmnVal = require("../common/common.repository");


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
      const sttsVal = await oneCmmnVal('PJT_STTS', project.dataValues.pjtStts);
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
    const query = `SELECT pj.PJT_SN, pj.PJT_NM, pj.PJT_INTRO, pj.START_DT, pj.END_DT, pj.PERIOD, pj.DURATION_UNIT, pj.CREATED_USER_SN, pj.PJT_STTS
                   FROM TB_USER usr
                          LEFT JOIN TB_PJT_M pjm ON usr.USER_SN = pjm.USER_SN AND pjm.DEL_YN = FALSE
                          LEFT JOIN TB_PJT pj ON pjm.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                   WHERE usr.USER_SN = ${userSn}
                   GROUP BY pj.PJT_SN;`;
    try {
      const pjtLists = await db.query(query, {type: QueryTypes.SELECT});
      return pjtLists
    } catch (error) {
      logger.error('내 프로젝트 리스트 조회 중 에러 발생:', error);
      throw error;
    }
  }

  async getProjectMember(req, res) {
    const user = req.userSn.USER_SN;
    const pjt = req.params.pjtSn;
    try {
      const memList = await db.TB_PJT_M.findAll({
        where: {PJT_SN: pjt, DEL_YN: false},
        attributes: [['PJT_MEM_SN', 'pjtMemSn'], ['USER_SN', 'userSn'], [db.Sequelize.col('TB_USER.USER_NM'), 'userNm'], ['PJT_ROLE_SN', 'pjtRoleSn'], [db.Sequelize.col('TB_PJT_ROLE.PART'), 'part'], ['FIRST_DT', 'firstDt'], ['END_DT', 'endDt'], ['DEL_YN', 'delYn'],],
        include: [{
          model: db.TB_USER, attributes: [],
        }, {
          model: db.TB_PJT_ROLE, attributes: [], where: {DEL_YN: false},
        }],
        having: db.Sequelize.literal(`
          EXISTS( SELECT 1 FROM TB_PJT_M pm WHERE pm.PJT_SN = ${pjt} AND pm.USER_SN = ${user})
        `)
      });
      if (!memList || memList.length === 0) {
        throwError('해당 프로젝트이 존재하지 않거나 권한이 없습니다.');
      }
      return memList;
    } catch (error) {
      throw error;
    }
  }

  async allProject(req, res) {
    const query = `SELECT pj.PJT_SN as pjtSn, pj.PJT_NM as pjtNm, pj.PJT_IMG as pjtImg, pj.START_DT as startDt, pj.END_DT as endDt, pj.PERIOD as period, pj.DURATION_UNIT as durationUnit, pj.PJT_INTRO as pjtIntro, pj.PJT_DETAIL as pjtDetail
                                , GROUP_CONCAT(DISTINCT st.ST_NM) AS stack
                                , SUM( DISTINCT pjr.TOTAL_CNT ) AS TO
                                , sum( DISTINCT pjr.CNT) AS \`PO\`
                                , JSON_ARRAYAGG( DISTINCT JSON_OBJECT( "part", pjr.PART, "totalCnt", pjr.TOTAL_CNT, "cnt", pjr.CNT)) AS role
                                , pj.WANTED as experience
                            FROM TB_PJT pj
                              INNER JOIN TB_USER tu ON tu.USER_SN = pj.CREATED_USER_SN
                              LEFT JOIN TB_PJT_SKILL pjSk ON pjSk.PJT_SN = pj.PJT_SN
                              LEFT JOIN TB_ST st ON st.ST_SN = pjSk.ST_SN
                              LEFT JOIN TB_PJT_ROLE pjr ON pjr.PJT_SN = pj.PJT_SN
                            WHERE pj.DEL_YN = FALSE
                            GROUP BY pjr.PJT_SN
                            ORDER BY pj.PJT_SN ASC;`;
    try {
      const result = await db.query(query, {type: QueryTypes.SELECT});
      for (let i = 0; i < result.length; i++) {
        result[i].experience = JSON.parse(result[i].experience);
      }
      return result
    } catch (error) {
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
        PJT_OPEN_YN,
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
      console.log(projectCreateDto)
      const newProject = await projectRepository.createProject({
        PJT_NM,
        PJT_IMG,
        PJT_INTRO,
        PJT_OPEN_YN,
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

      // if (file) {
      //   const type = 'project';
      //   const serialNum = newProject.PJT_SN;
      //   await minioService.upload(file, 'project', serialNum, transaction);
      // }

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
      const pjtJson = JSON.stringify(pjtData);
      await runPjtToVec(pjtJson).then(() => {
        logger.log("프로젝트 벡터화 완료")
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

  async getWbs(userSn, pjtSn) {
    let depth1Array = [];
    try {
      const member = await db.TB_PJT_M.findOne({
        where: {PJT_SN: pjtSn, USER_SN: userSn, DEL_YN: false}
      });
      if(!member){ throwError('프로젝트 참여 멤버가 아닙니다.'); }

      const depth1Data = await db.TB_WBS.findAll({
        where: {PJT_SN: pjtSn, PARENT_SN: null},
        order: [
            ['ORDER_NUM', 'ASC']
        ]
      });

      for (const depth1 of depth1Data){
        let depth2Array = [];
        const depth2Data = await db.TB_WBS.findAll({
          where: {PJT_SN: pjtSn, PARENT_SN: depth1.TICKET_SN, DEL_YN: false},
          order: [
            ['ORDER_NUM', 'ASC']
          ]
        });

        for(const depth2 of depth2Data){
          let depth3Array = [];
          const depth3Data = await db.TB_WBS.findAll({
            where: {PJT_SN: pjtSn, PARENT_SN: depth2.TICKET_SN, DEL_YN: false},
            order: [
              ['ORDER_NUM', 'ASC']
            ]
          });
          if(depth3Data[0].WORKER === null){
            for(const depth3 of depth3Data){
              let depth4Array = [];
              const depth4Data = await db.TB_WBS.findAll({
                where: {PJT_SN: pjtSn, PARENT_SN: depth3.TICKET_SN, DEL_YN: false},
                order: [
                  ['ORDER_NUM', 'ASC']
                ]
              });
              for(const depth4 of depth4Data){
                const user = await db.TB_USER.findOne({where:{USER_SN: depth4.WORKER}});
                const object = {
                  TICKET_SN: depth4.TICKET_SN,
                  name: depth4.TICKET_NAME,
                  PARENT_SN: depth4.PARENT_SN,
                  ORDER_NUM: depth4.ORDER_NUM,
                  data: {
                    WORKER: depth4.WORKER,
                    WORKER_NM: user.USER_NM,
                    START_DT: depth4.START_DT,
                    END_DT: depth4.END_DT,
                    STATUS: depth4.STATUS
                  }
                };
                depth4Array.push(object);
              }
              const depth3Object = {
                TICKET_SN: depth3.TICKET_SN,
                name: depth3.TICKET_NAME,
                ORDER_NUM: depth3.ORDER_NUM,
                PARENT_SN: depth3.PARENT_SN,
                child: depth4Array
              };
              depth3Array.push(depth3Object);
            }
          }
          else{
            for(const depth3 of depth3Data){
              const user = await db.TB_USER.findOne({where:{USER_SN:depth3.WORKER}});
              const depth3Object = {
                TICKET_SN: depth3.TICKET_SN,
                name: depth3.TICKET_NAME,
                PARENT_SN: depth3.PARENT_SN,
                ORDER_NUM: depth3.ORDER_NUM,
                data: {
                  WORKER: depth3.WORKER,
                  WORKER_NM: user.USER_NM,
                  START_DT: depth3.START_DT,
                  END_DT: depth3.END_DT,
                  STATUS: depth3.STATUS
                }
              };
              depth3Array.push(depth3Object);
            }
            const depth2Object = {
              TICKET_SN: depth2.TICKET_SN,
              name: depth2.TICKET_NAME,
              PARENT_SN: depth2.PARENT_SN,
              ORDER_NUM: depth2.ORDER_NUM,
              child: depth3Array
            };
            depth2Array.push(depth2Object);
          }
        }
        const depth1Object = {
          TICKET_SN: depth1.TICKET_SN,
          name: depth1.TICKET_NAME,
          ORDER_NUM: depth1.ORDER_NUM,
          child: depth2Array
        };
        depth1Array.push(depth1Object);
      }
      return {
        wbsData: depth1Array
      };

    } catch (error) {
      logger.error('wbs 조회 중 오류 발생 : ', error.message);
      throw error;
    }
  }

  async getWbsTemplate(template) {
    try {
      // const template = await db.TB_WBS.findOne({
      //   where: {PJT_SN: pjtSn, DEL_YN: false},
      //   attributes: ['TEMPLATE_DATA'],
      // });
      const template = {
        "basic2depth": {
          name: "기본 2 Depth"
        },
        "basic3depth": {
          name: "기본 3 Depth"
        },
        "planning": {
          name: "기획팀 템플릿"
        },
        "design": {
          name: "디자인 템플릿"
        },
        "development": {
          name: "개발팀 템플릿"
        },
        "backend": {
          name: "개발팀 템플릿 (웹 백엔드)"
        },
        "frontend": {
          name: "개발팀 템플릿 (웹 프론트엔드)"
        }
      }
      return template;
      //return template.TEMPLATE_DATA ? JSON.parse(template.TEMPLATE_DATA) : null;
    } catch (error) {
      logger.error('WBS 템플릿 조회 중 오류 발생: ', error.message);
      throw error;
    }
  }
}



module.exports = new projectService();
