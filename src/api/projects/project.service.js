const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const { QueryTypes } = require("sequelize");
const {runPytonToVectorization, runPjtToVec} = require("../../utils/matching/spawnVectorization");
const mutex = require('../../utils/matching/Mutex');
const {throwError} = require("../../utils/errors");
class projectService {

  async reqProject(userSn, pjtSn) {

    const query = `SELECT pj.PJT_SN as pjtSn, pj.PJT_NM as pjtNm, pj.PJT_IMG as pjtImg, pj.START_DT as startDt, pj.END_DT as endDt, pj.PERIOD as period, pj.DURATION_UNIT as durationUnit, pj.PJT_INTRO as pjtIntro, pj.PJT_DETAIL as pjtDetail
                                , GROUP_CONCAT(DISTINCT st.ST_NM) AS stack
                                , SUM( DISTINCT pjr.TOTAL_CNT ) AS PO
                                , sum( DISTINCT pjr.CNT) AS \`TO\`
                                , JSON_ARRAYAGG( DISTINCT JSON_OBJECT( "part", pjr.PART, "totalCnt", pjr.TOTAL_CNT, "cnt", pjr.CNT)) AS role
                                , pj.WANTED as experience
                            FROM TB_PJT pj
                              INNER JOIN TB_REQ r ON r.PJT_SN = pj.PJT_SN AND r.REQ_STTS in ('REQ','AGREE','CONFIRM') AND r.DEL_YN = FALSE
                              INNER JOIN TB_USER tu ON r.USER_SN = tu.USER_SN AND tu.DEL_YN= FALSE
                              LEFT JOIN TB_PJT_SKILL pjSk ON pjSk.PJT_SN = pj.PJT_SN
                              LEFT JOIN TB_ST st ON st.ST_SN = pjSk.ST_SN
                              LEFT JOIN TB_PJT_ROLE pjr ON pjr.PJT_SN = pj.PJT_SN
                            WHERE pj.PJT_SN = ${pjtSn} AND tu.USER_SN = ${userSn} AND pj.DEL_YN = FALSE
                            GROUP BY pjr.PJT_SN;`;
    try {
      const result = await db.query(query, {type: QueryTypes.SELECT});
      if(result[0] == null){
        logger.error("요청받은 포르젝트 조회 실패 - 프로젝트가 없거나 권한이 없음")
        throw new Error("해당 프로젝트가 존재하지 않거나 권한이 없습니다.")
      }
      result[0].experience = JSON.parse(result[0].experience);
      return result;
    } catch (error){
      logger.error("요청받은 포르젝트 조회 실패", error)
      throw error;
    }
  }

  async myProject(userSn, pjtSn) {

    try {
      const project = await db.TB_PJT.findOne({
        where: {
          PJT_SN: pjtSn,
          DEL_YN: false
        },
        attributes:[
          ['PJT_SN', 'pjtSn'],
          ['PJT_NM', 'pjtNm'],
          ['CREATED_USER_SN','createdUerSn'],
          [db.Sequelize.col('tu.USER_NM'), 'teamLeader'],
          ['PJT_IMG','pjtImg'],
          ['PJT_STTS','pjtStts'],
          ['START_DT','startDt'],
          ['END_DT', 'endDt'],
          ['PERIOD', 'period'],
          ['DURATION_UNIT', 'durationUnit'],
          ['PJT_INTRO', 'pjtIntro'],
          ['PJT_DETAIL','pjtDetail'],
          [db.Sequelize.literal('GROUP_CONCAT(DISTINCT ST_NM)'), 'stack'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal('TOTAL_CNT')), 'PO'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal('CNT')), 'TO'],
          [db.Sequelize.literal(
              `JSON_ARRAYAGG(DISTINCT JSON_OBJECT(
                    "pjtRoleSn", tpr.PJT_ROLE_SN,
                    "part", tpr.PART,
                    "totalCnt", tpr.TOTAL_CNT,
                    "cnt", tpr.CNT,
                    "mem", (
                      SELECT GROUP_CONCAT(um.USER_NM)
                      FROM TB_PJT_M pm
                      INNER JOIN TB_USER um ON pm.USER_SN = um.USER_SN
                      WHERE pm.PJT_SN = ${pjtSn} AND pm.PJT_ROLE_SN = tpr.PJT_ROLE_SN AND pm.DEL_YN = FALSE
                      GROUP BY pm.PJT_ROLE_SN
                    )
                  ))`
          ), 'role'],
          ['WANTED','wanted'],
        ],
        include:[
          {
            model: db.TB_USER,
            as: 'tu',
            attributes: [],
          },
          {
            model: db.TB_PJT_SKILL,
            required: false,
            attributes: [],
            include: [
              {
                model: db.TB_ST,
                attributes: ['ST_NM'],
              }
            ],
          },
          {
            model: db.TB_PJT_ROLE,
            as: 'tpr',
            attributes: [],
          },
          {
            model: db.TB_PJT_M,
            attributes: [],
            where: {USER_SN: userSn}
          },
        ],
        group: ['PJT_SN']
      });


      if(!project){
        throwError('해당 프로젝트가 존재하지 않거나 권한이 없습니다.');
      }
      const pjtStts = await db.TB_CMMN_CD.findOne({
        attributes: ['CMMN_CD_VAL'],
        where: {
          CMMN_CD_TYPE: 'PJT_STTS',
          CMMN_CD: project.dataValues.pjtStts
        }
      })
      project.dataValues.pjtStts = pjtStts.dataValues.CMMN_CD_VAL;
      return project;

    } catch (error){
      logger.error("내 단일 포르젝트 조회 실패", error)
      throw error;
    }
  }

  async myProjects(req, res) {
    const userSn = req.userSn.USER_SN;
    const query = `SELECT pj.PJT_SN, pj.PJT_NM, pj.PJT_INTRO, pj.START_DT, pj.END_DT, pj.PERIOD, pj.DURATION_UNIT, pj.CREATED_USER_SN, pj.PJT_STTS
                   FROM TB_USER usr
                          LEFT JOIN TB_PJT_M pjm ON usr.USER_SN = pjm.USER_SN AND pjm.DEL_YN = FALSE
                          LEFT JOIN TB_PJT pj ON pjm.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                   WHERE usr.USER_SN = ${userSn}
                   GROUP BY pj.PJT_SN;`;
    try {
      const pjtLists = await db.query(query, {type: QueryTypes.SELECT});
      return res.status(200).send(pjtLists);
    } catch (error) {
      throw error;
    }
  }

  async getProjectMember(req,res){
    const user = req.userSn.USER_SN;
    const pjt = req.params.pjtSn;
    console.log(pjt);
    try{
      const memList = await db.TB_PJT_M.findAll({
        where: {PJT_SN: pjt, DEL_YN: false},
        attributes: [
          ['PJT_MEM_SN','pjtMemSn'],
          ['USER_SN','userSn'],
          [db.Sequelize.col('TB_USER.USER_NM'), 'userNm'],
          ['PJT_ROLE_SN','pjtRoleSn'],
          [db.Sequelize.col('TB_PJT_ROLE.PART'), 'part'],
          ['FIRST_DT','firstDt'],
          ['END_DT','endDt'],
          ['DEL_YN','delYn'],
        ],
        include: [
          {
            model: db.TB_USER,
            attributes: [],
          },
          {
            model: db.TB_PJT_ROLE,
            attributes: [],
            where: { DEL_YN:false},
          }
        ],
        having: db.Sequelize.literal(`
          EXISTS( SELECT 1 FROM TB_PJT_M pm WHERE pm.PJT_SN = ${pjt} AND pm.USER_SN = ${user})
        `)
      });
      if(!memList || memList.length === 0){
        throwError('해당 프로젝트이 존재하지 않거나 권한이 없습니다.');
      }
      return memList;
    } catch (error){
      throw error;
    }
  }

  async allProject(req, res){
    const query = `SELECT pj.PJT_SN as pjtSn, pj.PJT_NM as pjtNm, pj.PJT_IMG as pjtImg, pj.START_DT as startDt, pj.END_DT as endDt, pj.PERIOD as period, pj.DURATION_UNIT as durationUnit, pj.PJT_INTRO as pjtIntro, pj.PJT_DETAIL as pjtDetail
                                , GROUP_CONCAT(DISTINCT st.ST_NM) AS stack
                                , SUM( DISTINCT pjr.TOTAL_CNT ) AS PO
                                , sum( DISTINCT pjr.CNT) AS \`TO\`
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
      for(let i = 0; i <result.length; i++){
        result[i].experience = JSON.parse(result[i].experience);
      }
      return result
    } catch (error){
      throw error;
    }
  }

  // 프로젝트 등록
  async registerProject(req, res) {
    const project = req.body;
    const user = req.userSn.USER_SN;
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
      } = project;

      // 필수 필드 확인
      const requiredFields = {
        PJT_NM: '프로젝트명이 입력되지 않았습니다.',
        PJT_INTRO: '프로젝트명 간단 설명이 입력되지 않았습니다.',
        PJT_OPEN_YN: '프로젝트 상세 공개 여부가 선택되지 않았습니다.',
        CONSTRUCTOR_ROLE: '프로젝트명 등록자 역할이 입력되지 않았습니다.',
        ROLES: '프로젝트 참여 인원 및 분야가 입력되지 않았습니다.',
        SELECTED_DT_YN: '프로젝트 기간 선택 여부가 입력되지 않았습니다.',
      }
      for (const [field, message] of Object.entries(requiredFields)) {
        if (project[field] === '' || project[field] === null) {
          throwError(message);
        }
      }
      if(SELECTED_DT_YN && !START_DT){ throwError('시작날짜가 입력되지 않았습니다.'); }
      if(!DURATION_UNIT || !PERIOD){ throwError('프로젝트 예상 기간을 입력하세요.'); }
      // 프로젝트 생성
      const newProject = await db.TB_PJT.create({
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
        WANTED: WANTED.join(','), // 배열을 JSON 문자열로 변환하여 저장
        PJT_DETAIL,
        PJT_STTS: "RECRUIT"
      }, {transaction});

      // 스택 처리
      for (const stack of STACKS) {
        const [st] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM.toLowerCase() },
          defaults: { ST_NM: stack.ST_NM.toLowerCase() },
          transaction
        });

        await db.TB_PJT_SKILL.create({
          PJT_SN: newProject.PJT_SN,
          ST_SN: st.ST_SN
        }, {transaction});
      }

      // 팀원
      for (const role of ROLES) {
        await db.TB_PJT_ROLE.create({
          PJT_SN: newProject.PJT_SN,
          PART: role.PART.toLowerCase(),
          TOTAL_CNT: role.TOTAL_CNT,
          CNT: 0 // 현재 참여자 수를 기본값 0으로 설정
        }, {transaction});
      }

      // 생성자 멤버추가
      const [constructorRole, created] = await db.TB_PJT_ROLE.findOrCreate({
        where: {PJT_SN: newProject.PJT_SN, PART: CONSTRUCTOR_ROLE.toLowerCase()},
        defaults: {
          PJT_SN: newProject.PJT_SN,
          PART: CONSTRUCTOR_ROLE,
          TOTAL_CNT: 1,
          CNT: 1
        },
        transaction
      });
      if(!created){
        constructorRole.TOTAL_CNT += 1;
        constructorRole.CNT += 1;
        await constructorRole.save({transaction});
      }
      await db.TB_PJT_M.create({
        PJT_SN: newProject.PJT_SN,
        USER_SN: user,
        PJT_ROLE_SN: constructorRole.PJT_ROLE_SN
      }, {transaction});

      await transaction.commit();
      return newProject.PJT_SN;
    } catch (error) {
      logger.error('프로젝트 등록 중 오류 발생:', error);
      await transaction.rollback();
      throw error;
    }
  }

  async toVectorPjt(userSn, pjtSn){
    try{
      await mutex.lock()
      const pjtData = await this.myProject(userSn, pjtSn);
      const pjtJson = JSON.stringify(pjtData.dataValues);
      await runPjtToVec(pjtJson).then(()=>{
          console.log("프로젝트 벡터화 완료")
      })
      mutex.unlock(); // Mutex 해제
    } catch (error){
      mutex.unlock(); // Mutex 해제
      throw new Error("프로젝트 데이터 벡터화 처리 중 에러 발생: ", error);
    }
  }
}

module.exports = new projectService();
