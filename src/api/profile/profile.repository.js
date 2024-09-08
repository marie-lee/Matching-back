const db = require('../../config/db/db');
const { QueryTypes } = require('sequelize');

// 프로필 생성
const createUserProfile = async (profileData, transaction) => {
  return await db.TB_PF.create(profileData, { transaction });
};

// 사용자 정보 업데이트
const createUser = async (userSn, userImg, transaction) => {
  return await db.TB_USER.update(
    { USER_IMG: userImg },
    { where: { USER_SN: userSn }, transaction }
  );
};

// 프로필 업데이트
const updateUserProfile = async (userSn, profileData, transaction) => {
  return await db.TB_PF.update(profileData, { where: { USER_SN: userSn }, transaction });
};

// 경력 생성
const createCareer = async (careerData, transaction) => {
  return await db.TB_CAREER.create(careerData, { transaction });
};

// 스택 생성 및 조회
const findOrCreateStack = async (stNm, transaction) => {
  return await db.TB_ST.findOrCreate({
    where: { ST_NM: stNm },
    defaults: { ST_NM: stNm },
    transaction
  });
};

// 프로필 스택 생성
const createProfileStack = async (profileStackData, transaction) => {
  return await db.TB_PF_ST.create(profileStackData, { transaction });
};

// 관심사 생성 및 조회
const createInterest = async (interestNm, transaction) => {
  return await db.TB_INTRST.findOrCreate({
    where: { INTRST_NM: interestNm },
    defaults: { INTRST_NM: interestNm },
    transaction
  });
};

// 프로필 관심사 생성
const createProfileInterest = async (profileInterestData, transaction) => {
  return await db.TB_PF_INTRST.create(profileInterestData, { transaction });
};

// URL 생성
const createUrl = async (urlData, transaction) => {
  return await db.TB_URL.create(urlData, { transaction });
};

// 프로필 URL 생성
const createProfileUrl = async (profileUrlData, transaction) => {
  return await db.TB_PF_URL.create(profileUrlData, { transaction });
};

// 프로필 상세 정보 삭제
const deleteProfileDetails = async (pfSn, transaction) => {
  await db.TB_CAREER.destroy({ where: { PF_SN: pfSn }, transaction });
  await db.TB_PF_ST.destroy({ where: { PF_SN: pfSn }, transaction });
  await db.TB_PF_INTRST.destroy({ where: { PF_SN: pfSn }, transaction });
  await db.TB_PF_URL.destroy({ where: { PF_SN: pfSn }, transaction });
};

// 포트폴리오 생성
const createPortfolio = async (portfolioData, transaction) => {
  return await db.TB_PFOL.create(portfolioData, { transaction });
};

// 프로필 포트폴리오 생성
const createProfilePortfolio = async (profilePortfolioData, transaction) => {
  return await db.TB_PF_PFOL.create(profilePortfolioData, { transaction });
};

// 포트폴리오 스택 생성
const createPortfolioStack = async (portfolioStackData, transaction) => {
  return await db.TB_PFOL_ST.create(portfolioStackData, { transaction });
};

// 역할 생성 및 조회
const createRole = async (roleNm, transaction) => {
  return await db.TB_ROLE.findOrCreate({
    where: { ROLE_NM: roleNm },
    defaults: { ROLE_NM: roleNm },
    transaction
  });
};

// 포트폴리오 역할 생성
const createPortfolioRole = async (portfolioRoleData, transaction) => {
  return await db.TB_PFOL_ROLE.create(portfolioRoleData, { transaction });
};

// 포트폴리오 URL 생성
const createPortfolioUrl = async (portfolioUrlData, transaction) => {
  return await db.TB_PFOL_URL.create(portfolioUrlData, { transaction });
};

// 포트폴리오 미디어 생성
const createPortfolioMedia = async (portfolioMediaData, transaction) => {
  return await db.TB_PFOL_MEDIA.create(portfolioMediaData, { transaction });
};

// 포트폴리오 조회(ID)
const findPortfolioById = async (pfolSn) => {
  return await db.TB_PFOL.findOne({ where: { PFOL_SN: pfolSn } });
};

// 포트폴리오 업데이트
const updatePortfolio = async (portfolioData, transaction) => {
  return await db.TB_PFOL.update(portfolioData, { where: { PFOL_SN: portfolioData.PFOL_SN }, transaction });
};

// 포트폴리오 상세 정보 삭제
const deletePortfolioDetails = async (pfolSn, transaction) => {
  await db.TB_PFOL_ST.destroy({ where: { PFOL_SN: pfolSn }, transaction });
  await db.TB_PFOL_ROLE.destroy({ where: { PFOL_SN: pfolSn }, transaction });
  await db.TB_PFOL_URL.destroy({ where: { PFOL_SN: pfolSn }, transaction });
  await db.TB_PFOL_MEDIA.destroy({ where: { PFOL_SN: pfolSn }, transaction });
};

// 전체 프로필 및 포트폴리오 조회
const findAllProfilesAndPortfolios = async (snList, userSn) => {
  let whereClause = '';
  let orderByClause = '';

  if (snList.length > 0) {
    const filteredSnList = snList.filter(sn => sn !== userSn);
    const pfSnList = filteredSnList.join(',');
    whereClause = `WHERE pf.PF_SN IN (${pfSnList})`;
    orderByClause = `ORDER BY FIELD(pf.PF_SN, ${pfSnList})`;
  }

  const query = `SELECT pf.PF_SN as pfSn, usr.USER_SN as userSn, usr.USER_NM as userNm
                    , JSON_OBJECT(
                        "introduction", pf.PF_INTRO,
                        "img", usr.USER_IMG,
                        "career", JSON_ARRAYAGG( DISTINCT JSON_OBJECT(
                            "careerNm", cr.CAREER_NM,
                            "enteringDt", cr.ENTERING_DT,
                            "quitDt", cr.QUIT_DT
                        )),
                        "stack", GROUP_CONCAT(DISTINCT st.ST_NM),
                        "interests", GROUP_CONCAT(DISTINCT intrst.INTRST_NM),
                        "url", GROUP_CONCAT(DISTINCT url.URL)
                    ) as profile
                    , JSON_ARRAYAGG( DISTINCT JSON_OBJECT(
                        "name", vpl.PFOL_NM,
                        "startDt", vpl.START_DT,
                        "endDt", vpl.END_DT,
                        "period", vpl.PERIOD,
                        "introduction", vpl.INTRO,
                        "memCnt", vpl.MEM_CNT,
                        "contribution", vpl.CONTRIBUTION,
                        "stack", vpl.STACK,
                        "role", vpl.\`ROLE\`,
                        "serviceStts", vpl.SERVICE_STTS,
                        "url", vpl.URL,
                        "media", vpl.MEDIA
                    )) AS portfolio
                FROM TB_PF pf
                    INNER JOIN TB_USER usr ON usr.USER_SN = pf.USER_SN
                    INNER JOIN TB_CAREER cr ON cr.PF_SN = pf.PF_SN
                    INNER JOIN TB_PF_ST pfSt ON pfSt.PF_SN = pf.PF_SN
                    INNER JOIN TB_ST st ON st.ST_SN = pfSt.ST_SN
                    INNER JOIN TB_PF_INTRST pfI ON pfI.PF_SN = pf.PF_SN
                    INNER JOIN TB_INTRST intrst ON intrst.INTRST_SN = pfI.INTRST_SN
                    INNER JOIN TB_PF_URL pfU ON pfU.PF_SN = pf.PF_SN
                    INNER JOIN TB_URL url ON pfU.URL_SN = url.URL_SN
                    INNER JOIN TB_PF_PFOL pfPl ON pfPl.PF_SN = pf.PF_SN
                    INNER JOIN VIEW_PFOL vpl ON vpl.PFOL_SN = pfPl.PFOL_SN
                ${whereClause}
                GROUP BY pf.PF_SN, usr.USER_SN, usr.USER_NM
                ${orderByClause};`;

  return db.query(query, { type: QueryTypes.SELECT });
};

// 프로필 조회
const findProfile = async (userSn) => {
  const careerData = [];
  const stackData = [];
  const intrstData = [];
  const urlData = [];
  const user = await db.TB_USER.findOne({where: {USER_SN: userSn}});
  const profile = await db.TB_PF.findOne({where: {USER_SN: userSn}});
  if(profile){
    const career = await db.TB_CAREER.findAll({where: {PF_SN: profile.PF_SN, DEL_YN: false}});
    const pfSt = await db.TB_PF_ST.findAll({where: {PF_SN: profile.PF_SN}});
    const pfIntrst = await db.TB_PF_INTRST.findAll({where: {PF_SN: profile.PF_SN}});
    const pfUrl = await db.TB_PF_URL.findAll({where: {PF_SN: profile.PF_SN}});
    for (const c of career) {
      careerData.push({
        CAREER_NM: c.CAREER_NM,
        ENTERING_DT: c.ENTERING_DT,
        QUIT_DT: c.QUIT_DT
      });
    }
    for (const s of pfSt) {
      const stack = await db.TB_ST.findOne({where: {ST_SN: s.ST_SN}});
      stackData.push({
        ST_NM: stack.ST_NM,
        ST_LEVEL: s.ST_LEVEL
      });
    }
    for (const i of pfIntrst) {
      const intrst = await db.TB_INTRST.findOne({where: {INTRST_SN: i.INTRST_SN}});
      intrstData.push({
        INTEREST_NM: intrst.INTRST_NM
      });
    }
    for (const u of pfUrl) {
      const url = await db.TB_URL.findOne({where: {URL_SN: u.URL_SN, DEL_YN: false}});
      urlData.push({
        URL_ADDR: url.URL,
        URL_INTRO: url.URL_INTRO
      });
    }

    return {
      PF_SN: profile.PF_SN,
      USER_SN: user.USER_SN,
      USER_NM: user.USER_NM,
      USER_IMG: user.USER_IMG,
      PF_INTRO: profile.PF_INTRO,
      career: careerData[0] ? careerData : null,
      stack: stackData[0] ? stackData : null,
      interest: intrstData[0] ? intrstData : null,
      url: urlData[0] ? urlData : null
    }
  }
  else return null;
};

const portfolioInfo = async (pfSn) => {
  const pfolData = [];
  const pfolList = await db.TB_PF_PFOL.findAll({where: {PF_SN: pfSn}});
  if(pfolList && pfolList.length !== 0){
    for (const pfPfol of pfolList) {
      const pfol = await db.TB_PFOL.findOne({where: {PFOL_SN: pfPfol.PFOL_SN}});
      const stackData = [];
      const roleData = [];
      const urlData = [];
      const imgData = [];
      let rateData = null;
      const stts = await db.TB_CMMN_CD.findOne({where: {CMMN_CD_TYPE: 'SERVICE_STTS', CMMN_CD: pfol.SERVICE_STTS}});
      const pfolSt = await db.TB_PFOL_ST.findAll({where: {PFOL_SN: pfol.PFOL_SN}});
      const pfolRole = await db.TB_PFOL_ROLE.findAll({where: {PFOL_SN: pfol.PFOL_SN}});
      const pfolUrl = await db.TB_PFOL_URL.findAll({where: {PFOL_SN: pfol.PFOL_SN, DEL_YN: false}});
      const pfolMedia = await db.TB_PFOL_MEDIA.findAll({where: {PFOL_SN: pfol.PFOL_SN, DEL_YN: false, TYPE: 'IMAGE'}});
      const pfolRate = await db.TB_RATE.findAll({where: {PJT_SN: pfol.PJT_SN}});
      const pfolVideo = await db.TB_PFOL_MEDIA.findOne({where: {PFOL_SN: pfol.PFOL_SN, DEL_YN: false, TYPE: 'VIDEO'}});

      for (const s of pfolSt) {
        const stack = await db.TB_ST.findOne({where: {ST_SN: s.ST_SN}});
        stackData.push({
          ST_NM: stack.ST_NM,
          ST_LEVEL: s.ST_LEVEL
        });
      }
      for (const r of pfolRole) {
        const role = await db.TB_ROLE.findOne({where: {ROLE_SN: r.ROLE_SN}});
        roleData.push({
          ROLE_SN: role.ROLE_SN,
          ROLE_NM: role.ROLE_NM
        });
      }
      for (const u of pfolUrl) {
        const url = await db.TB_URL.findOne({where: {URL_SN: u.URL_SN, DEL_YN: false}});
        urlData.push({
          URL_SN: url.URL_SN,
          URL: url.URL,
          OS: u.OS,
          URL_INTRO: url.URL_INTRO
        });
      }
      let imgCnt = 0;
      for (const m of pfolMedia) {
        imgData.push({
          ID: imgCnt,
          URL: m.URL,
          MAIN_YN: m.MAIN_YN
        });
        imgCnt++;
      }

      for (const rate of pfolRate) {
        if (rateData === null) rateData = rate.RATE_TEXT;
        else rateData = `${rateData}, ${rate.RATE_TEXT}`;
      }


      pfolData.push({
        PFOL_SN: pfol.PFOL_SN,
        PFOL_NM: pfol.PFOL_NM,
        INTRO: pfol.INTRO,
        START_DT: pfol.START_DT,
        END_DT: pfol.END_DT,
        PERIOD: pfol.PERIOD,
        MEM_CNT: pfol.MEM_CNT,
        stack: stackData[0] ? stackData : null,
        role: roleData[0] ? roleData : null,
        CONTRIBUTION: pfol.CONTRIBUTION,
        SERVICE_STTS: pfol.SERVICE_STTS,
        SERVICE_STTS_VAL: stts ? stts.CMMN_CD_VAL : null,
        RESULT: pfol.RESULT,
        CREATED_DT: pfol.CREATED_DT,
        MODIFIED_DT: pfol.MODIFIED_DT,
        url: urlData[0] ? urlData : null,
        IMG: imgData[0] ? imgData : null,
        VIDEO: pfolVideo ? {URL: pfolVideo.URL} : null,
        RATE: rateData
      });
    }
    return pfolData[0] ? pfolData : null;
  }
  else return null
};

// 포트폴리오 전체 조회
const portfolioInfoSelect = async (pfSn) => {
  const pfolData = [];
  const pfolList = await db.TB_PF_PFOL.findAll({where: {PF_SN: pfSn}});
  for (const pfPfol of pfolList) {
    const pfol = await db.TB_PFOL.findOne({where: {PFOL_SN: pfPfol.PFOL_SN}});
    const stackData = [];
    const roleData = [];
    const urlData = [];
    const imgData = [];
    let rateData = null;
    let mainImg = null;
    const stts = await db.TB_CMMN_CD.findOne({where: {CMMN_CD_TYPE: 'SERVICE_STTS', CMMN_CD: pfol.SERVICE_STTS}});
    const pfolSt = await db.TB_PFOL_ST.findAll({where: {PFOL_SN: pfol.PFOL_SN}});
    const pfolRole = await db.TB_PFOL_ROLE.findAll({where: {PFOL_SN: pfol.PFOL_SN}});
    const pfolUrl = await db.TB_PFOL_URL.findAll({where: {PFOL_SN: pfol.PFOL_SN, DEL_YN: false}});
    const pfolMedia = await db.TB_PFOL_MEDIA.findAll({where: {PFOL_SN: pfol.PFOL_SN, DEL_YN: false}});
    const pfolRate = await db.TB_RATE.findAll({where: {PJT_SN: pfol.PJT_SN}});

    for (const s of pfolSt) {
      const stack = await db.TB_ST.findOne({where: {ST_SN: s.ST_SN}});
      stackData.push({
        ST_NM: stack.ST_NM,
        ST_LEVEL: s.ST_LEVEL
      });
    }
    for (const r of pfolRole) {
      const role = await db.TB_ROLE.findOne({where: {ROLE_SN: r.ROLE_SN}});
      roleData.push({
        ROLE_SN: role.ROLE_SN,
        ROLE_NM: role.ROLE_NM
      });
    }
    for (const u of pfolUrl) {
      const url = await db.TB_URL.findOne({where: {URL_SN: u.URL_SN, DEL_YN: false}});
      urlData.push({
        URL_SN: url.URL_SN,
        URL: url.URL,
        OS: u.OS,
        URL_INTRO: url.URL_INTRO
      });
    }
    for (const m of pfolMedia) {
      if(m.MAIN_YN) mainImg = m.URL;
      else imgData.push(m.URL);
    }

      for (const rate of pfolRate) {
        if(rateData===null) rateData = rate.RATE_TEXT;
        else rateData = `${rateData}, ${rate.RATE_TEXT}`;
      }


    pfolData.push({
      PFOL_SN: pfol.PFOL_SN,
      PFOL_NM: pfol.PFOL_NM,
      INTRO: pfol.INTRO,
      START_DT: pfol.START_DT,
      END_DT: pfol.END_DT,
      PERIOD: pfol.PERIOD,
      MEM_CNT: pfol.MEM_CNT,
      stack: stackData[0] ? stackData : null,
      role: roleData[0] ? roleData : null,
      CONTRIBUTION: pfol.CONTRIBUTION,
      SERVICE_STTS: pfol.SERVICE_STTS,
      SERVICE_STTS_VAL: stts ? stts.CMMN_CD_VAL : null,
      RESULT: pfol.RESULT,
      CREATED_DT: pfol.CREATED_DT,
      MODIFIED_DT: pfol.MODIFIED_DT,
      url: urlData[0] ? urlData : null,
      IMG: mainImg,
      IMG_SUB: imgData[0] ? imgData : null,
      RATE: rateData
    });
  }
  return pfolData[0] ? pfolData : null;
};

// 프로필 포트폴리오 정보 조회
const findPortfolioInfo = async (pfSn) => {
  const query = `SELECT pl.PFOL_SN
                    , pl.PFOL_NM
                    , pl.INTRO
                    , pl.START_DT
                    , pl.END_DT
                    , pl.PERIOD
                    , pl.MEM_CNT
                    , JSON_ARRAYAGG( DISTINCT
                        JSON_OBJECT(
                        'ST_SN', st.ST_SN
                            ,'ST_NM', st.ST_NM
                        )
                    ) AS stack
                    , JSON_ARRAYAGG( DISTINCT
                        JSON_OBJECT(
                        'ROLE_SN', tr.ROLE_SN
                            ,'ROLE_NM', tr.ROLE_NM
                        )
                    ) AS role
                    , pl.CONTRIBUTION
                    , pl.SERVICE_STTS
                    , tcc.CMMN_CD_VAL AS SERVICE_STTS_VAL
                    , pl.\`RESULT\`
                    , pl.CREATED_DT
                    , pl.MODIFIED_DT
                    , JSON_ARRAYAGG( DISTINCT
                        JSON_OBJECT(
                        'URL_SN', tpu.URL_SN
                            ,'URL', tu.URL
                            , 'OS', tpu.OS
                        )
                    ) AS url
                    , CASE
                        WHEN pm.MAIN_YN = 1 THEN pm.URL
                            ELSE NULL
                        END AS IMG
                    , JSON_ARRAYAGG(pm.URL) AS IMG_SUB
                FROM TB_PFOL pl
                LEFT JOIN TB_PF_PFOL pp ON pl.PFOL_SN = pp.PFOL_SN
                LEFT JOIN TB_PFOL_ST ps ON ps.PFOL_SN = pp.PFOL_SN
                LEFT JOIN TB_ST st ON st.ST_SN = ps.ST_SN
                LEFT JOIN TB_PFOL_ROLE tpr ON tpr.PFOL_SN = pl.PFOL_SN
                LEFT JOIN TB_ROLE tr ON tr.ROLE_SN = tpr.ROLE_SN
                LEFT JOIN TB_PFOL_URL tpu ON tpu.PFOL_SN = pl.PFOL_SN AND tpu.DEL_YN = false
                LEFT JOIN TB_URL tu ON tu.URL_SN = tpu.URL_SN
                LEFT JOIN TB_PFOL_MEDIA pm ON pl.PFOL_SN = pm.PFOL_SN
                LEFT JOIN TB_CMMN_CD tcc ON tcc.CMMN_CD_TYPE = 'SERVICE_STTS' AND tcc.CMMN_CD = pl.SERVICE_STTS
                WHERE pp.PF_SN = ${pfSn} AND pl.DEL_YN = 'N'
                GROUP BY pl.PFOL_SN
                ORDER BY pl.START_DT ASC`;

  return db.query(query, { type: QueryTypes.SELECT });
};

// 포트폴리오 상세 조회
const findPortfolioDetail = async (userSn, pfolSn) => {
  const query = `SELECT pl.PFOL_SN
                    , pl.PFOL_NM
                    , pl.START_DT
                    , pl.END_DT
                    , pl.PERIOD
                    , pl.INTRO
                    , pl.MEM_CNT
                    , pl.CONTRIBUTION
                    , pl.SERVICE_STTS
                    , pl.RESULT
                    , JSON_ARRAYAGG(DISTINCT
                        JSON_OBJECT(
                            'ST_NM', st.ST_NM
                        )
                    ) AS stack
                    , JSON_ARRAYAGG(DISTINCT
                        JSON_OBJECT(
                            'ROLE_NM', r.ROLE_NM
                        )
                    ) AS roles
                    , JSON_ARRAYAGG(DISTINCT
                        JSON_OBJECT(
                            'URL', u.URL,
                            'URL_INTRO', u.URL_INTRO,
                            'RELEASE_YN', pu.RELEASE_YN,
                            'OS', pu.OS
                        )
                    ) AS urls
                    , JSON_ARRAYAGG(DISTINCT
                        JSON_OBJECT(
                            'URL', pm.URL,
                            'MAIN_YN', pm.MAIN_YN
                        )
                    ) AS media
                FROM TB_PFOL pl
                LEFT JOIN TB_PFOL_ST ps ON pl.PFOL_SN = ps.PFOL_SN
                LEFT JOIN TB_ST st ON st.ST_SN = ps.ST_SN
                LEFT JOIN TB_PFOL_ROLE pr ON pl.PFOL_SN = pr.PFOL_SN
                LEFT JOIN TB_ROLE r ON r.ROLE_SN = pr.ROLE_SN
                LEFT JOIN TB_PFOL_URL pu ON pl.PFOL_SN = pu.PFOL_SN
                LEFT JOIN TB_URL u ON pu.URL_SN = u.URL_SN
                LEFT JOIN TB_PFOL_MEDIA pm ON pl.PFOL_SN = pm.PFOL_SN
                WHERE pl.PFOL_SN = ${pfolSn} AND pl.DEL_YN = 'N'
                GROUP BY pl.PFOL_SN;`;

  const portfolioDetail = await db.query(query, { type: QueryTypes.SELECT });
  return portfolioDetail[0];
};

// 벡터화 조회
const findProfileAndPortfolioForVectorization = async (userSn) => {
  const query = `SELECT pf.PF_SN as pfSn, usr.USER_SN as userSn, usr.USER_NM as userNm
                    , JSON_OBJECT(
                        "introduction", pf.PF_INTRO,
                        "img", usr.USER_IMG,
                        "career", JSON_ARRAYAGG( DISTINCT JSON_OBJECT(
                            "careerNm", IFNULL(cr.CAREER_NM,''),
                            "enteringDt", IFNULL(cr.ENTERING_DT,''),
                            "quitDt", IFNULL(cr.QUIT_DT,'')
                        )),
                        "stack", GROUP_CONCAT(DISTINCT st.ST_NM),
                        "interests", GROUP_CONCAT(DISTINCT intrst.INTRST_NM),
                        "url", GROUP_CONCAT(DISTINCT url.URL)
                    ) as profile
                    , JSON_ARRAYAGG( DISTINCT JSON_OBJECT(
                        "name", vpl.PFOL_NM,
                        "startDt", vpl.START_DT,
                        "endDt", vpl.END_DT,
                        "period", vpl.PERIOD,
                        "introduction", vpl.INTRO,
                        "memCnt", vpl.MEM_CNT,
                        "contribution", vpl.CONTRIBUTION,
                        "stack", vpl.STACK,
                        "role", vpl.\`ROLE\`,
                        "serviceStts", vpl.SERVICE_STTS,
                        "url", vpl.URL,
                        "media", vpl.MEDIA
                    )) AS portfolio
                FROM TB_PF pf
                    INNER JOIN TB_USER usr ON usr.USER_SN = pf.USER_SN
                    LEFT JOIN TB_CAREER cr ON cr.PF_SN = pf.PF_SN
                    LEFT JOIN TB_PF_ST pfSt ON pfSt.PF_SN = pf.PF_SN
                    INNER JOIN TB_ST st ON st.ST_SN = pfSt.ST_SN
                    LEFT JOIN TB_PF_INTRST pfI ON pfI.PF_SN = pf.PF_SN
                    LEFT JOIN TB_INTRST intrst ON intrst.INTRST_SN = pfI.INTRST_SN
                    LEFT JOIN TB_PF_URL pfU ON pfU.PF_SN = pf.PF_SN
                    INNER JOIN TB_URL url ON pfU.URL_SN = url.URL_SN
                    LEFT JOIN TB_PF_PFOL pfPl ON pfPl.PF_SN = pf.PF_SN
                    LEFT JOIN VIEW_PFOL vpl ON vpl.PFOL_SN = pfPl.PFOL_SN
                WHERE usr.USER_SN = ${userSn} AND usr.DEL_YN = 'N'
                GROUP BY pf.PF_SN, usr.USER_SN, usr.USER_NM;`;

  return db.query(query, { type: QueryTypes.SELECT });
};

module.exports = {
  createUserProfile,
  createUser,
  updateUserProfile,
  createCareer,
  findOrCreateStack,
  createProfileStack,
  createInterest,
  createProfileInterest,
  createUrl,
  createProfileUrl,
  deleteProfileDetails,
  createPortfolio,
  createProfilePortfolio,
  createPortfolioStack,
  createRole,
  createPortfolioRole,
  createPortfolioUrl,
  createPortfolioMedia,
  findPortfolioById,
  updatePortfolio,
  deletePortfolioDetails,
  findAllProfilesAndPortfolios,
  portfolioInfoSelect,
  findProfile,
  findPortfolioInfo,
  portfolioInfo,
  findPortfolioDetail,
  findProfileAndPortfolioForVectorization
};
