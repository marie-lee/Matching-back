const db = require('../../config/db/db');
const {logger} = require("../../utils/logger");
const {QueryTypes,Op} = require("sequelize");

// 프로젝트 생성
const createProject = async(projectData, transaction) => {
    return await db.TB_PJT.create(projectData, {transaction});
}

// 스택 조회
const findOrCreateStack = async(stNm, transaction) => {
    return await db.TB_ST.findOrCreate({
        where: {ST_NM: stNm},
        defaults: {ST_NM: stNm},
        transaction
    });
}

// 스택 생성
const createProjectSkill = async(projectSkillData, transaction) => {
    return await db.TB_PJT_SKILL.create(projectSkillData, {transaction});
}

// 프로젝트 파트 추가
const createProjectRole = async(roleData, transaction) => {
    return await db.TB_PJT_ROLE.create(roleData, {transaction});
}

// 프로젝트 파트 조회 후 생성
const findOrCreateProjectRole = async(roleData, transaction) => {
    return await db.TB_PJT_ROLE.findOrCreate({
        where: {PJT_SN: roleData.PJT_SN, PART: roleData.PART.toLowerCase()},
        defaults: roleData,
        transaction
    });
}

// 프로젝트 파트 업데이트
const updateProjectRole = async(role, transaction) => {
    return await role.save({transaction});
}

// 프로젝트 멤버 생성
const createProjectMember = async(memberData, transaction) => {
    return await db.TB_PJT_M.create(memberData, {transaction});
}

// 프로젝트 조회(ID)
const getProjectById = async(pjtSn) => {
    return await db.TB_PJT.findByPk(pjtSn);
}

// 프로젝트 전체 조회
const getAllProjects = async() => {
    const query = `SELECT pj.PJT_SN as pjtSn, pj.PJT_NM as pjtNm, pj.PJT_IMG as pjtImg, pj.START_DT as startDt, pj.END_DT as endDt, pj.PERIOD as period, pj.DURATION_UNIT as durationUnit, pj.PJT_INTRO as pjtIntro, pj.PJT_DETAIL as pjtDetail
                        , GROUP_CONCAT(DISTINCT st.ST_NM) AS stack
                        , SUM(DISTINCT pjr.TOTAL_CNT) AS \`TO\`
                        , SUM(DISTINCT pjr.CNT) AS \`PO\`
                        , JSON_ARRAYAGG(DISTINCT JSON_OBJECT("part", pjr.PART, "totalCnt", pjr.TOTAL_CNT, "cnt", pjr.CNT)) AS role
                        , pj.WANTED as wanted
                    FROM TB_PJT pj
                      INNER JOIN TB_USER tu ON tu.USER_SN = pj.CREATED_USER_SN
                      LEFT JOIN TB_PJT_SKILL pjSk ON pjSk.PJT_SN = pj.PJT_SN
                      LEFT JOIN TB_ST st ON st.ST_SN = pjSk.ST_SN
                      LEFT JOIN TB_PJT_ROLE pjr ON pjr.PJT_SN = pj.PJT_SN
                    WHERE pj.DEL_YN = FALSE
                    GROUP BY pjr.PJT_SN
                    ORDER BY pj.PJT_SN ASC;`;
    return db.query(query, {type: QueryTypes.SELECT});
}

// 내 프로젝트 조회
const getMyProjects = async(userSn) => {
    const query = `SELECT pj.PJT_SN, pj.PJT_NM, pj.PJT_INTRO, pj.START_DT, pj.END_DT, pj.PERIOD, pj.DURATION_UNIT, pj.CREATED_USER_SN, pj.PJT_STTS
                   FROM TB_USER usr
                          LEFT JOIN TB_PJT_M pjm ON usr.USER_SN = pjm.USER_SN AND pjm.DEL_YN = FALSE
                          LEFT JOIN TB_PJT pj ON pjm.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                          INNER JOIN TB_CMMN_CD tcc ON tcc.CMMN_CD_TYPE = 'PJT_STTS' AND tcc.CMMN_CD = pj.PJT_STTS
                   WHERE usr.USER_SN = ${userSn}
                   GROUP BY pj.PJT_SN
                   ORDER BY pj.CREATED_DT DESC;`;

    return await db.query(query, {type: QueryTypes.SELECT});
}

// 프로젝트 멤버 조회
const findProjectMember = async(pjtSn, userSn) => {
    return await db.TB_PJT_M.findOne({
        where: {PJT_SN: pjtSn, USER_SN: userSn, DEL_YN: false}
    });
}

// 프로젝트 정보 조회
const getProjectIntro = async(pjtSn) => {
    return await db.TB_PJT.findOne({
        where: {PJT_SN: pjtSn, DEL_YN: false},
        attributes: [
            ['PJT_SN', 'pjtSn'],
            ['PJT_NM', 'pjtNm'],
            ['CREATED_USER_SN', 'createdUserSn'],
            [db.Sequelize.col('tu.USER_NM'), 'teamLeader'],
            ['PJT_IMG', 'pjtImg'],
            ['PJT_STTS', 'pjtStts'],
            ['START_DT', 'startDt'],
            ['END_DT', 'endDt'],
            ['PERIOD', 'period'],
            ['DURATION_UNIT', 'durationUnit'],
            ['PJT_INTRO', 'pjtIntro'],
            ['PJT_DETAIL', 'pjtDetail'],
            [db.Sequelize.literal('GROUP_CONCAT(DISTINCT ST_NM)'), 'stack'],
            [db.Sequelize.fn('SUM', db.Sequelize.literal('DISTINCT TOTAL_CNT')), 'TO'],
            [db.Sequelize.fn('SUM', db.Sequelize.literal('DISTINCT CNT')), 'PO'],
            [db.Sequelize.literal(`JSON_ARRAYAGG(DISTINCT JSON_OBJECT(
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
                ))`), 'role'],
            ['WANTED', 'wanted']
        ],
        include: [
            {
                model: db.TB_USER, as: 'tu', attributes: []
            },
            {
                model: db.TB_PJT_SKILL, required: false, attributes: [], include: [{
                    model: db.TB_ST, attributes: ['ST_NM']
                }]
            },
            {
                model: db.TB_PJT_ROLE, as: 'tpr', attributes: []
            }
        ],
        group: ['PJT_SN']
    });
}

const findProjectMembers = async(user, pjt) => {
    return await db.TB_PJT_M.findAll({
        where: {PJT_SN: pjt, DEL_YN: false},
        attributes: [
            ['PJT_MEM_SN', 'pjtMemSn'],
            ['USER_SN', 'userSn'],
            [db.Sequelize.col('TB_USER.USER_NM'), 'userNm'],
            [db.Sequelize.col('TB_USER.USER_IMG'), 'userImg'],
            ['PJT_ROLE_SN', 'pjtRoleSn'],
            [db.Sequelize.col('TB_PJT_ROLE.PART'), 'part'],
            ['FIRST_DT', 'firstDt'],
            ['END_DT', 'endDt'],
            ['DEL_YN', 'delYn']
        ],
        include: [
            {model: db.TB_USER, attributes: []},
            {model: db.TB_PJT_ROLE, attributes: [], where: {DEL_YN: false}}
        ],
        having: db.Sequelize.literal(`EXISTS(SELECT 1 FROM TB_PJT_M pm WHERE pm.PJT_SN = ${pjt} AND pm.USER_SN = ${user})`)
    });
}

const myOneProject = async(userSn, pjtSn) => {
        return await db.TB_PJT.findOne({where: {PJT_SN: pjtSn, CREATED_USER_SN: userSn, DEL_YN: false}});
}

const pjtRoleInfo = async(pjtRoleSn) => {
        return await db.TB_PJT_ROLE.findOne({where: {PJT_ROLE_SN: pjtRoleSn}});
}
const pjtRoleMem = async(memData) => {
        return await db.TB_PJT_M.findOne({where:memData});
}

const updatePjtMemCnt = async(pjtRole, transaction) => {
        await pjtRole.increment('CNT', {by: 1, transaction})
}

const myCreatedProjectList = async(user) => {
    return await db.TB_PJT.findAll({where: {CREATED_USER_SN: user, DEL_YN:false}});
}

const findRateMember = async (pjt,user)=>{
  return await db.TB_PJT_M.findAll({
    where: { PJT_SN: pjt, DEL_YN: false,USER_SN: { [Op.ne]: user }},
    attributes: [
      ['PJT_MEM_SN', 'pjtMemSn'],
      ['USER_SN', 'userSn'],
      [db.Sequelize.col('TB_USER.USER_NM'), 'userNm'],
      [db.Sequelize.col('TB_PJT_ROLE.PART'), 'part'],
      ['CONTRIBUTION', 'contribution'],
      [db.Sequelize.literal(`(SELECT IF(COUNT(*) > 0, 1, 0) FROM TB_RATE WHERE TARGET_SN = TB_PJT_M.USER_SN AND PJT_SN = ${pjt} AND RATER_SN = ${user})`), 'isRated']
    ],
    include: [
      { model: db.TB_USER, attributes: [] },
      { model: db.TB_PJT_ROLE, attributes: [] }
    ],
    having: db.Sequelize.literal(`EXISTS(SELECT 1 FROM TB_PJT_M pm WHERE pm.PJT_SN = ${pjt} AND pm.USER_SN = ${user})`)
  });
};

const getProjectInfo = async (pjtSn, userSn) => {
  const query = `
    SELECT
      pj.PJT_SN as pjtSn,
      pj.PJT_NM as pjtNm,
      pj.PJT_IMG as pjtImg,
      pj.START_DT as startDt,
      pj.END_DT as endDt,
      (SELECT COUNT(*) FROM TB_PJT_M WHERE PJT_SN = ${pjtSn} AND DEL_YN = FALSE) as totalMembers,
      tpr.PART as role,
      GROUP_CONCAT(DISTINCT st.ST_NM) as stack,
      pjm.CONTRIBUTION as contribution
    FROM TB_PJT pj
           LEFT JOIN TB_PJT_M pjm ON pj.PJT_SN = pjm.PJT_SN AND pjm.DEL_YN = FALSE
           LEFT JOIN TB_PJT_ROLE tpr ON pjm.PJT_ROLE_SN = tpr.PJT_ROLE_SN AND tpr.DEL_YN = FALSE
           LEFT JOIN TB_PJT_SKILL pjs ON pj.PJT_SN = pjs.PJT_SN
           LEFT JOIN TB_ST st ON pjs.ST_SN = st.ST_SN
    WHERE pj.PJT_SN = ${pjtSn} AND pj.DEL_YN = FALSE AND pjm.USER_SN = ${userSn}
    GROUP BY pj.PJT_SN, tpr.PART, pjm.CONTRIBUTION;
  `;
  return await db.query(query, {type: QueryTypes.SELECT});
};

const rateMember = async (rateData, transaction) => {
  return await db.TB_RATE.create(rateData, { transaction });
};

const findExistingRate = async (pjtSn, targetSn, userSn) => {
  return await db.TB_RATE.findOne({
    where: {
      PJT_SN: pjtSn,
      TARGET_SN: targetSn,
      RATER_SN: userSn,
      DEL_YN: false
    }
  });
};

const findMyRates = async (userSn,pjtSn) => {
  return await db.TB_RATE.findAll({
    where: { TARGET_SN: userSn, PJT_SN: pjtSn, DEL_YN: false },
    attributes: ['RATE_1', 'RATE_2', 'RATE_3', 'RATE_4', 'RATE_5', 'RATE_TEXT'],
  });
};

// 기여도 계산 - WBS 정보 조회
const findWbsTicketsByProject = async (pjtSn) => {
  return db.TB_WBS.findAll({
    where: { PJT_SN: pjtSn, DEL_YN: false },
    attributes: ['WORKER', 'LEVEL', 'START_DT', 'END_DT','STATUS']
  });
};

// 기여도 계산
const updateContribution = async (pjtSn, workerSn, contribution, transaction) => {
  return db.TB_PJT_M.update(
    { CONTRIBUTION: contribution },
    { where: { PJT_SN: pjtSn, USER_SN: workerSn }, transaction }
  );
};

// 프로젝트 멤버 조회
const findProjectMembersByProject = async (pjtSn) => {
  return db.TB_PJT_M.findAll({
    where: { PJT_SN: pjtSn, DEL_YN: false },
    attributes: ['USER_SN', 'CONTRIBUTION']
  });
};

module.exports = {
    createProject,
    findOrCreateStack,
    createProjectSkill,
    createProjectRole,
    findOrCreateProjectRole,
    updateProjectRole,
    createProjectMember,
    getProjectById,
    getAllProjects,
    getMyProjects,
    findProjectMember,
    getProjectIntro,
    findProjectMembers,
    myOneProject,
    pjtRoleInfo,
    pjtRoleMem,
    updatePjtMemCnt,
    myCreatedProjectList,
    findRateMember,
    rateMember,
    findExistingRate,
    findMyRates,
    findWbsTicketsByProject,
    updateContribution,
    findProjectMembersByProject,
    getProjectInfo
};
