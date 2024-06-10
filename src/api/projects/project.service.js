const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const { QueryTypes } = require("sequelize");

class projectService {


  async myProject(req,res) {

    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;

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
                            WHERE pj.PJT_SN = ${pjtSn} AND tu.USER_SN = ${userSn}
                            GROUP BY pjr.PJT_SN;`;
    try {
      const result = await db.query(query, {type: QueryTypes.SELECT});
      if (result.length > 0) {
        result[0].experience = JSON.parse(result[0].experience);
      }
      return result;
    } catch (error){
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

  // 프로젝트 등록
  async registerProject(project, user) {
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
        WANTED,
        PJT_DETAIL,
        PJT_STTS,
        STACKS,
        ROLES
      } = project;

      // 필수 필드 확인
      if (!PJT_NM || !PJT_INTRO || !PJT_STTS || !SELECTED_DT_YN) {
        logger.error('필수 필드를 입력하세요.');
      }

      if (SELECTED_DT_YN === 'Y' && !START_DT) {
        logger.error('START_DT는 SELECTED_DT_YN이 Y인 경우 필수입니다.');
      }

      if (!user || !user.USER_SN) {
        logger.error('사용자 정보를 찾을 수 없습니다.');
      }

      // 프로젝트 생성
      const newProject = await db.TB_PJT.create({
        PJT_NM,
        PJT_IMG,
        PJT_INTRO,
        PJT_OPEN_YN: PJT_OPEN_YN === 'Y', // Boolean 변환
        CREATED_USER_SN: user.USER_SN,
        CONSTRUCTOR_ROLE,
        SELECTED_DT_YN: SELECTED_DT_YN === 'Y', // Boolean 변환
        START_DT: SELECTED_DT_YN === 'Y' ? START_DT : null,
        PERIOD,
        DURATION_UNIT,
        WANTED: JSON.stringify(WANTED), // 배열을 JSON 문자열로 변환하여 저장
        PJT_DETAIL,
        PJT_STTS
      }, {transaction});

      // 스택 처리
      for (const stack of STACKS) {
        const [st, created] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM },
          defaults: { ST_NM: stack.ST_NM },
          transaction: transaction
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
          PART: role.PART,
          TOTAL_CNT: role.TOTAL_CNT,
          CNT: 0 // 현재 참여자 수를 기본값 0으로 설정
        }, {transaction});
      }

      // 생성자 멤버추가
      const constructorRole = await db.TB_PJT_ROLE.create({PJT_SN: newProject.PJT_SN, PART: CONSTRUCTOR_ROLE, TOTAL_CNT: 1, CNT: 1},{transaction});
      await db.TB_PJT_M.create({
        PJT_SN: newProject.PJT_SN,
        USER_SN: user.USER_SN,
        PJT_ROLE_SN: constructorRole.PJT_ROLE_SN
      }, {transaction});

      await transaction.commit();
    } catch (error) {
      logger.error('프로젝트 등록 중 오류 발생:', error);
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new projectService();
