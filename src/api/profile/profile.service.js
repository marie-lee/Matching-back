const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const minio = require('../../middleware/minio/minio.service');
const {QueryTypes} = require("sequelize");
const {runPfPfolToVec} = require("../../utils/matching/spawnVectorization");
const mutex = require('../../utils/matching/Mutex');
const {throwError} = require("../../utils/errors");
const {Op} = require("sequelize");

class profileService {
  async profileUpload(userSn, profileData, portfolios, userImg, portfolioMedia) {
    const t = await db.transaction();
    try {
      if (!profileData && !portfolios) {
        throwError('프로필과 포트폴리오 데이터가 없습니다.');
      } else if (profileData && !portfolios) {
        const pf = await this.profileInsert(profileData, userSn, t, userImg);
        if (pf) {
          await t.commit();
          await this.toVectorPfPfol(userSn);
        } else {
          await this.profileModify(userSn, profileData, portfolios, userImg, portfolioMedia,t);

          await t.commit();
        }
      } else if (profileData && portfolios) {
        const pf = await this.profileInsert(profileData, userSn, t, userImg);
        if (pf) {
          for (const portfolio of portfolios) {
            await this.portfolioInsert(portfolio, pf, t, portfolioMedia);
          }
          await t.commit();
          await this.toVectorPfPfol(userSn);
        } else {
          await this.profileModify(userSn, profileData, portfolios, userImg, portfolioMedia,t);
          await t.commit();
        }
      }
    } catch (error) {
      await this.deleteFileFromMinio(profileData, portfolios);
      await t.rollback();
      logger.error('프로필 포트폴리오 등록 중 에러 발생:', error);
      throw error;
    }
  }

  async profileModify(userSn, profileData, portfolios, userImg, portfolioMedia,t) {
    try {
      const pf = await this.profileUpdate(profileData, userSn, t, userImg);
      if (portfolios) {
        for (const portfolio of portfolios) {
          await this.portfolioUpdate(portfolio, pf, t, portfolioMedia);
        }
      }

      await this.toVectorPfPfol(userSn);
    } catch (error) {
      await this.deleteFileFromMinio(profileData, portfolios);
      throw error;
    }
  }

  async profileUpdate(profile, userSn, transaction, userImg) {
    try {
      const existingProfile = await db.TB_PF.findOne({ where: { USER_SN: userSn } });
      if (existingProfile) {
        await db.TB_PF.update({ PF_INTRO: profile.PF_INTRO }, { where: { USER_SN: userSn }, transaction });

        if (userImg) {
          const user = await db.TB_USER.findOne({where: {USER_SN: userSn}});
          const fileName = this.fileUrlParsing(user.USER_IMG);
          await minio.deleteFile(fileName);
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }
        await this.updateProfileDetails(existingProfile.PF_SN, profile, transaction);
        return existingProfile;
      } else {
        const newProfile = await db.TB_PF.create({ PF_INTRO: profile.PF_INTRO, USER_SN: userSn }, { transaction });

        if (userImg) {
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }

        await this.insertProfileDetails(newProfile.PF_SN, profile, transaction);
        return newProfile;
      }
    } catch (error) {
      throw error;
    }
  }

  async insertProfileDetails(pfSn, profile, transaction) {
    if (profile.CAREER) {
      for (const career of profile.CAREER) {
        await db.TB_CAREER.create({
          CAREER_NM: career.CAREER_NM,
          ENTERING_DT: career.ENTERING_DT,
          QUIT_DT: career.QUIT_DT,
          PF_SN: pfSn
        }, { transaction });
      }
    }

    if (profile.STACK) {
      for (const stack of profile.STACK) {
        const [st] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM },
          defaults: { ST_NM: stack.ST_NM },
          transaction: transaction
        });
        await db.TB_PF_ST.create({
          PF_SN: pfSn,
          ST_SN: st.ST_SN,
          ST_LEVEL: stack.LEVEL
        }, { transaction });
      }
    }
    if (profile.INTRST) {
      for (const intrst of profile.INTRST) {
        const [intr] = await db.TB_INTRST.findOrCreate({
          where: { INTRST_NM: intrst },
          defaults: { INTRST_NM: intrst },
          transaction: transaction
        });
        await db.TB_PF_INTRST.create({ PF_SN: pfSn, INTRST_SN: intr.INTRST_SN }, { transaction });
      }
    }
    if (profile.URL) {
      for (const url of profile.URL) {
        const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
        await db.TB_PF_URL.create({ PF_SN: pfSn, URL_SN: u.URL_SN }, { transaction });
      }
    }
  }

  async updateProfileDetails(pfSn, profile, transaction) {
    await db.TB_CAREER.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_ST.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_INTRST.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_URL.destroy({ where: { PF_SN: pfSn }, transaction });
    await this.insertProfileDetails(pfSn, profile, transaction);
  }

  async portfolioUpdate(portfolio, pf, transaction, portfolioMedia) {
    try {
      let pfol;
      if (portfolio.PFOL_SN) {
        pfol = await db.TB_PFOL.findOne({ where: { PFOL_SN: portfolio.PFOL_SN } });
        if (pfol) {
          await db.TB_PFOL.update({
            PFOL_NM: portfolio.PFOL_NM,
            START_DT: portfolio.START_DT,
            END_DT: portfolio.END_DT,
            PERIOD: portfolio.PERIOD,
            INTRO: portfolio.INTRO,
            MEM_CNT: portfolio.MEM_CNT,
            CONTRIBUTION: portfolio.CONTRIBUTION,
            SERVICE_STTS: portfolio.SERVICE_STTS,
            RESULT: portfolio.RESULT
          }, { where: { PFOL_SN: portfolio.PFOL_SN }, transaction });

          if(portfolio.MEDIA){
            for(const media of portfolio.MEDIA){
              if(media.fileName){
                const file = portfolioMedia.find(f => f.originalname === media.fileName);
                if(file){
                  await minio.portfolioUpload(file, media.MAIN_YN, pfol.PFOL_SN, transaction);
                }
              }
              else if(media.URL){
                if(media.DEL_YN) {
                  await db.TB_PFOL_MEDIA.update({DELETED_DT: new Date(), DEL_YN: media.DEL_YN, MAIN_YN: media.MAIN_YN}, {
                    where: {PFOL_SN: portfolio.PFOL_SN, URL: media.URL},
                    transaction
                  });
                  const fileName = this.fileUrlParsing(media.URL);
                  await minio.deleteFile(fileName);
                }
              }
              else{
                await db.TB_PFOL_MEDIA.update({MAIN_YN: media.MAIN_YN}, {
                  where: {PFOL_SN: portfolio.PFOL_NM, URL: media.URL},
                  transaction
                });
              }
            }
          }

          await this.updatePortfolioDetails(portfolio.PFOL_SN, portfolio, transaction);
        }
      } else {
        pfol = await this.portfolioInsert(portfolio, pf, transaction, portfolioMedia);
      }
      return pfol;
    } catch (error) {
      throw error;
    }
  }

  async insertPortfolioDetails(pfolSn, portfolio, transaction) {
    if (portfolio.STACK) {
      for (const stack of portfolio.STACK) {
        const [st] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM },
          defaults: { ST_NM: stack.ST_NM },
          transaction: transaction
        });
        await db.TB_PFOL_ST.create({ PFOL_SN: pfolSn, ST_SN: st.ST_SN }, { transaction });
      }
    }
    if (portfolio.ROLE) {
      for (const role of portfolio.ROLE) {
        const [r] = await db.TB_ROLE.findOrCreate({
          where: { ROLE_NM: role },
          defaults: { ROLE_NM: role },
          transaction: transaction
        });
        await db.TB_PFOL_ROLE.create({ PFOL_SN: pfolSn, ROLE_SN: r.ROLE_SN }, { transaction });
      }
    }
    if (portfolio.URL) {
      for (const url of portfolio.URL) {
        const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
        await db.TB_PFOL_URL.create({
          PFOL_SN: pfolSn,
          URL_SN: u.URL_SN,
          RELEASE_YN: url.RELEASE_YN,
          OS: url.OS
        }, { transaction });
      }
    }
  }

  async updatePortfolioDetails(pfolSn, portfolio, transaction) {
    await db.TB_PFOL_ST.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_ROLE.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_URL.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await this.insertPortfolioDetails(pfolSn, portfolio, transaction);
  }
  async profileInsert(profile, userSn, transaction, userImg) {
    try {
      if (await db.TB_PF.findOne({ where: { USER_SN: userSn } })) {
        logger.error('해당 유저의 프로필이 이미 존재합니다.');
        return false;
      } else {
        const pf = await db.TB_PF.create({ PF_INTRO: profile.PF_INTRO, USER_SN: userSn }, { transaction });

        if (userImg) {
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }

        await this.insertProfileDetails(pf.PF_SN, profile, transaction);
        return pf;
      }
    } catch (error) {
      throw error;
    }
  }

  async portfolioInsert(portfolio, pf, transaction, portfolioMedia) {
    try {
      const pfol = await db.TB_PFOL.create({
        PFOL_NM: portfolio.PFOL_NM,
        START_DT: portfolio.START_DT,
        END_DT: portfolio.END_DT,
        PERIOD: portfolio.PERIOD,
        INTRO: portfolio.INTRO,
        MEM_CNT: portfolio.MEM_CNT,
        CONTRIBUTION: portfolio.CONTRIBUTION,
        SERVICE_STTS: portfolio.SERVICE_STTS,
        RESULT: portfolio.RESULT
      }, { transaction });

      await db.TB_PF_PFOL.create({ PF_SN: pf.PF_SN, PFOL_SN: pfol.PFOL_SN }, { transaction });

      if(portfolio.MEDIA){
        for(const media of portfolio.MEDIA){
          const file = portfolioMedia.find(f => f.originalname === media.fileName);
          if(file){
            await minio.portfolioUpload(file, media.MAIN_YN, pfol.PFOL_SN, transaction);
          }
        }
      }

      await this.insertPortfolioDetails(pfol.PFOL_SN, portfolio, transaction);
      return pfol;
    } catch (error) {
      throw error;
    }
  }
  fileUrlParsing(url){
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const pathnameParts = pathname.split('/').filter(part => part.length); // 빈 문자열 제거
    return pathnameParts.slice(1).join('/');
  }

  async deleteFileFromMinio(profile, portfolios){
    try {
      if (profile.USER_IMG && profile.USER_IMG.trim() !== '') {
        const profileFile = this.fileUrlParsing(profile.USER_IMG);
        await minio.deleteFile(profileFile);
      }
      if(portfolios) {
        for (const portfolio of portfolios) {
          if (portfolio.MEDIA) {
            for (const media of portfolio.MEDIA) {
              if (media.URL && media.URL.trim() !== '') {
                const fileName = this.fileUrlParsing(media.URL);
                await minio.deleteFile(fileName);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async pfPfolSelectAll(snList = [], userSn = null){
    let whereClause = '';
    let orderByClause = '';
    // keys 배열이 비어있지 않다면 WHERE 조건을 추가
    if (snList.length > 0) {
      // 본인 프로필 제거
      const filteredSnList = snList.filter(sn => sn !== userSn);
      const pfSnList = filteredSnList.join(','); // 배열을 문자열로 변환
      whereClause = `WHERE pf.PF_SN IN (${pfSnList})`;
      orderByClause = `ORDER BY FIELD(pf.PF_SN, ${pfSnList})`
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
    try {
      return await db.query(query, {type: QueryTypes.SELECT});
    } catch (error){
      logger.error("프로필 및 포트폴리오 전체 조회 실패", error)
      throw error;
    }
  }

  async pfPfolSelect(userSn){
    try {
      // 프로필 조회
      const profile = await this.profileSelect(userSn);
      // 포트폴리오정보 조회(평가 내역있을 시 추가)
      const portfolioInfo = await this.portfolioInfoSelect(profile[0].PF_SN);

      // 프로필 데이터가 없을 때
      if (!profile || profile.length === 0) {
        return res.status(404).send('프로필이 입력되지 않았습니다.');
      }
      // 프로필O 포트폴리오X
      if (!portfolioInfo || portfolioInfo.length === 0) {
        return {
          profile: profile,
          portfolioInfo: [],
          message: '포트폴리오가 작성되지 않았습니다.'
        };
      }
      const pfPfol = {profile: profile, portfolioInfo: portfolioInfo};
      return pfPfol;
    } catch (error){
      logger.error("프로필 및 포트폴리오 조회 중 오류 발생: ", error);
      throw error;
    }
  }

  async profileSelect(userSn){
    const query = `SELECT  pf.PF_SN
                                    , usr.USER_SN
                                    , usr.USER_NM
                                    , usr.USER_IMG
                                    , pf.PF_INTRO
                                    , JSON_ARRAYAGG( DISTINCT
                                        JSON_OBJECT(
                                            'CARRER_NM', cr.CAREER_NM
                                            , 'ENTERING_DT', cr.ENTERING_DT
                                            , 'QUIT_DT', cr.QUIT_DT
                                        )
                                    ) AS carrer
                                    , JSON_ARRAYAGG( DISTINCT
                                        JSON_OBJECT(
                                            'ST_NM', st.ST_NM
                                            , 'ST_LEVEL', ps.ST_LEVEL
                                        )
                                    ) AS stack
                                    , JSON_ARRAYAGG( DISTINCT
                                        JSON_OBJECT( 'INTEREST_NM', i.INTRST_NM )
                                    ) AS interest
                                    , JSON_ARRAYAGG( DISTINCT
                                        JSON_OBJECT(
                                            'URL_ADDR', u.URL
                                            ,'URL_INTRO', u.URL_INTRO
                                        )
                                    ) AS url
                                FROM TB_PF pf
                                    LEFT JOIN TB_USER usr ON usr.USER_SN = pf.USER_SN
                                    LEFT JOIN TB_CAREER cr ON cr.PF_SN = pf.PF_SN AND cr.DEL_YN = FALSE
                                    LEFT JOIN TB_PF_ST ps ON pf.PF_SN = ps.PF_SN
                                    LEFT JOIN TB_ST st ON ps.ST_SN = st.ST_SN
                                    LEFT JOIN TB_PF_INTRST pi ON pf.PF_SN = pi.PF_SN
                                    LEFT JOIN TB_INTRST i ON pi.INTRST_SN = i.INTRST_SN
                                    LEFT JOIN TB_PF_URL pu ON pf.PF_SN = pu.PF_SN
                                    LEFT JOIN TB_URL u ON pu.URL_SN = u.URL_SN AND u.DEL_YN = FALSE
                                WHERE pf.DEL_YN = FALSE AND usr.USER_SN = ${userSn}`;
    try{
      return await db.query(query, {type: QueryTypes.SELECT});
    }
    catch (error) {
      logger.error("프로필 조회 중 오류 발생: ", error);
      throw error;
    }
  }

  async toVectorPfPfol(userSn){
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
                                WHERE usr.USER_SN = ${userSn} AND usr.DEL_YN = 'N'
                                GROUP BY pf.PF_SN, usr.USER_SN, usr.USER_NM;`;
    try {
      // await mutex.lock();
      const pfPfolData = await db.query(query, {type: QueryTypes.SELECT});
      const pfPfolJson = JSON.stringify(pfPfolData);
      await runPfPfolToVec(pfPfolJson);
      // mutex.unlock(); // Mutex 해제
    } catch (error){
      // mutex.unlock(); // Mutex 해제
      throw error;
    }
  }

  async portfolioInfoSelect(pfSn) {
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
                                    , JSON_ARRAYAGG(DISTINCT pm.URL) AS IMG_SUB
                                    , GROUP_CONCAT( DISTINCT tr2.RATE_TEXT) AS RATE
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
                                LEFT JOIN TB_RATE tr2 ON tr2.PJT_SN = pl.PJT_SN
                                WHERE pp.PF_SN = ${pfSn} AND pl.DEL_YN = 'N'
                                GROUP BY pl.PFOL_SN
                                ORDER BY pl.START_DT ASC`;
    try{
      const portfolioInfo = await db.query(query, {type: QueryTypes.SELECT});
      return portfolioInfo;
    }
    catch (error) {
      logger.error("포트폴리오 조회 중 오류 발생: ", error);
      throw error;
    }
  }

  async portfolioDetailSelect(userSn,pfolSn) {
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
                                      , JSON_ARRAYAGG(DISTINCT tr.RATE_TEXT) AS RATE
                                  FROM TB_PFOL pl
                                  LEFT JOIN TB_PFOL_ST ps ON pl.PFOL_SN = ps.PFOL_SN
                                  LEFT JOIN TB_ST st ON st.ST_SN = ps.ST_SN
                                  LEFT JOIN TB_PFOL_ROLE pr ON pl.PFOL_SN = pr.PFOL_SN
                                  LEFT JOIN TB_ROLE r ON r.ROLE_SN = pr.ROLE_SN
                                  LEFT JOIN TB_PFOL_URL pu ON pl.PFOL_SN = pu.PFOL_SN
                                  LEFT JOIN TB_URL u ON pu.URL_SN = u.URL_SN
                                  LEFT JOIN TB_PFOL_MEDIA pm ON pl.PFOL_SN = pm.PFOL_SN
                                  LEFT JOIN TB_RATE tr ON tr.PJT_SN = pl.PJT_SN
                                  WHERE pl.PFOL_SN = ${pfolSn} AND pl.DEL_YN = 'N'
                                  GROUP BY pl.PFOL_SN;`;
    try {
      const portfolioDetail = await db.query(query, { type: QueryTypes.SELECT });
      if (portfolioDetail.length === 0) {
        throwError('포트폴리오를 찾을 수 없습니다.');
      }
      return portfolioDetail[0];
    } catch (error) {
      logger.error("포트폴리오 상세 조회 중 오류 발생: ", error);
      throw error;
    }
  }

  // 프로필, 포트폴리오 테스트 코드
  async profileUploadTest(userSn, profileData, portfolios, userImg, portfolioMedia) {
    const t = await db.transaction();
    try {
      if (!profileData && !portfolios) {
        throwError('프로필과 포트폴리오 데이터가 없습니다.');
      } else if (profileData && !portfolios) {
        const pf = await this.profileInsertTest(profileData, userSn, t, userImg);
        if (pf) {
          await t.commit();
          // await this.toVectorPfPfol(userSn);
        } else {
          await this.profileModifyTest(userSn, profileData, portfolios, userImg, portfolioMedia,t);

          await t.commit();
        }
      } else if (profileData && portfolios) {
        const pf = await this.profileInsertTest(profileData, userSn, t, userImg);
        if (pf) {
          let pfolCnt = 0;
          for (const portfolio of portfolios) {
            await this.portfolioInsertTest(portfolio, pf, t, portfolioMedia, pfolCnt);
            pfolCnt++;
          }
          await t.commit();
          // await this.toVectorPfPfol(userSn);
        } else {
          await this.profileModifyTest(userSn, profileData, portfolios, userImg, portfolioMedia,t);
          await t.commit();
        }
      }
    } catch (error) {
      await this.deleteFileFromMinio(profileData, portfolios);
      await t.rollback();
      logger.error('프로필 포트폴리오 등록 중 에러 발생:', error);
      throw error;
    }
  }

  async profileModifyTest(userSn, profileData, portfolios, userImg, portfolioMedia,t) {
    try {
      const pf = await this.profileUpdateTest(profileData, userSn, t, userImg);
      if (portfolios) {
        let pfolCnt = 0;
        let pfolList = [];
        for (const portfolio of portfolios) {
          const pfol = await this.portfolioUpdateTest(portfolio, pf, t, portfolioMedia, pfolCnt);
          pfolCnt++;
          pfolList.push(pfol.PFOL_SN);
        }
        const deletePfolList = await db.TB_PF_PFOL.findAll({where:{
          PF_SN: pf.PF_SN, PFOL_SN: {[Op.notIn]: pfolList}
          }});
        for (const delPfol of deletePfolList){
          await this.deletePortfolioDetailsTest(delPfol.PFOL_SN, t);
          await db.TB_PFOL.update({DEL_YN: true, DELETE_DT: new Date()}, {
            where: {PFOL_SN: delPfol.PFOL_SN},
            t
          });
          await db.TB_PF_PFOL.destroy({where: {PFOL_SN : delPfol.PFOL_SN},t});
        }
      }

      // await this.toVectorPfPfol(userSn);
    } catch (error) {
      await this.deleteFileFromMinio(profileData, portfolios);
      throw error;
    }
  }

  async profileUpdateTest(profile, userSn, transaction, userImg) {
    try {
      const existingProfile = await db.TB_PF.findOne({ where: { USER_SN: userSn } });
      if (existingProfile) {
        await db.TB_PF.update({ PF_INTRO: profile.PF_INTRO }, { where: { USER_SN: userSn }, transaction });

        if (userImg) {
          const user = await db.TB_USER.findOne({where: {USER_SN: userSn}});
          const fileName = this.fileUrlParsing(user.USER_IMG);
          await minio.deleteFile(fileName);
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }
        await this.updateProfileDetailsTest(existingProfile.PF_SN, profile, transaction);
        return existingProfile;
      } else {
        const newProfile = await db.TB_PF.create({ PF_INTRO: profile.PF_INTRO, USER_SN: userSn }, { transaction });

        if (userImg) {
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }

        await this.insertProfileDetailsTest(newProfile.PF_SN, profile, transaction);
        return newProfile;
      }
    } catch (error) {
      throw error;
    }
  }

  async insertProfileDetailsTest(pfSn, profile, transaction) {
    if (profile.CAREER) {
      for (const career of profile.CAREER) {
        await db.TB_CAREER.create({
          CAREER_NM: career.CAREER_NM,
          ENTERING_DT: career.ENTERING_DT,
          QUIT_DT: career.QUIT_DT,
          PF_SN: pfSn
        }, { transaction });
      }
    }

    if (profile.STACK) {
      for (const stack of profile.STACK) {
        const [st] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM },
          defaults: { ST_NM: stack.ST_NM },
          transaction: transaction
        });
        await db.TB_PF_ST.create({
          PF_SN: pfSn,
          ST_SN: st.ST_SN,
          ST_LEVEL: stack.LEVEL
        }, { transaction });
      }
    }
    if (profile.INTRST) {
      for (const intrst of profile.INTRST) {
        const [intr] = await db.TB_INTRST.findOrCreate({
          where: { INTRST_NM: intrst },
          defaults: { INTRST_NM: intrst },
          transaction: transaction
        });
        await db.TB_PF_INTRST.create({ PF_SN: pfSn, INTRST_SN: intr.INTRST_SN }, { transaction });
      }
    }
    if (profile.URL) {
      for (const url of profile.URL) {
        const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
        await db.TB_PF_URL.create({ PF_SN: pfSn, URL_SN: u.URL_SN }, { transaction });
      }
    }
  }

  async updateProfileDetailsTest(pfSn, profile, transaction) {
    await db.TB_CAREER.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_ST.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_INTRST.destroy({ where: { PF_SN: pfSn }, transaction });
    await db.TB_PF_URL.destroy({ where: { PF_SN: pfSn }, transaction });
    await this.insertProfileDetailsTest(pfSn, profile, transaction);
  }

  async portfolioUpdateTest(portfolio, pf, transaction, portfolioMedia, pfolCnt) {
    try {
      let pfol;
      if (portfolio.PFOL_SN) {
        pfol = await db.TB_PFOL.findOne({ where: { PFOL_SN: portfolio.PFOL_SN } });
        if (pfol) {
          await db.TB_PFOL.update({
            PFOL_NM: portfolio.PFOL_NM,
            START_DT: portfolio.START_DT,
            END_DT: portfolio.END_DT,
            PERIOD: portfolio.PERIOD,
            INTRO: portfolio.INTRO,
            MEM_CNT: portfolio.MEM_CNT,
            CONTRIBUTION: portfolio.CONTRIBUTION,
            SERVICE_STTS: portfolio.SERVICE_STTS,
            RESULT: portfolio.RESULT
          }, { where: { PFOL_SN: portfolio.PFOL_SN }, transaction });

          if(portfolio.MEDIA){
            let mediaCnt = 0;
            for(const media of portfolio.MEDIA){
              if(!portfolioMedia[pfolCnt][mediaCnt]){
                const file = portfolioMedia[pfolCnt][mediaCnt];
                if(file){
                  await minio.portfolioUpload(file, media.MAIN_YN, pfol.PFOL_SN, transaction);
                }
              }
              else if(media.URL){
                if(media.DEL_YN) {
                  await db.TB_PFOL_MEDIA.update({DELETED_DT: new Date(), DEL_YN: media.DEL_YN, MAIN_YN: media.MAIN_YN}, {
                    where: {PFOL_SN: portfolio.PFOL_SN, URL: media.URL},
                    transaction
                  });
                  const fileName = this.fileUrlParsing(media.URL);
                  await minio.deleteFile(fileName);
                }
                else{
                  await db.TB_PFOL_MEDIA.update({MAIN_YN: media.MAIN_YN}, {
                    where: {PFOL_SN: portfolio.PFOL_NM, URL: media.URL},
                    transaction
                  });
                }
              }
              mediaCnt++;
            }
          }

          await this.updatePortfolioDetailsTest(portfolio.PFOL_SN, portfolio, transaction);
        }
      } else {
        pfol = await this.portfolioInsertTest(portfolio, pf, transaction, portfolioMedia, pfolCnt);
      }
      return pfol;
    } catch (error) {
      throw error;
    }
  }

  async insertPortfolioDetailsTest(pfolSn, portfolio, transaction) {
    if (portfolio.STACK) {
      for (const stack of portfolio.STACK) {
        const [st] = await db.TB_ST.findOrCreate({
          where: { ST_NM: stack.ST_NM },
          defaults: { ST_NM: stack.ST_NM },
          transaction: transaction
        });
        await db.TB_PFOL_ST.create({ PFOL_SN: pfolSn, ST_SN: st.ST_SN }, { transaction });
      }
    }
    if (portfolio.ROLE) {
      for (const role of portfolio.ROLE) {
        const [r] = await db.TB_ROLE.findOrCreate({
          where: { ROLE_NM: role },
          defaults: { ROLE_NM: role },
          transaction: transaction
        });
        await db.TB_PFOL_ROLE.create({ PFOL_SN: pfolSn, ROLE_SN: r.ROLE_SN }, { transaction });
      }
    }
    if (portfolio.URL) {
      for (const url of portfolio.URL) {
        const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
        await db.TB_PFOL_URL.create({
          PFOL_SN: pfolSn,
          URL_SN: u.URL_SN,
          RELEASE_YN: url.RELEASE_YN,
          OS: url.OS
        }, { transaction });
      }
    }
  }

  async deletePortfolioDetailsTest(pfolSn, transaction){
    await db.TB_PFOL_ST.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_ROLE.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_URL.destroy({ where: { PFOL_SN: pfolSn }, transaction });
  }

  async updatePortfolioDetailsTest(pfolSn, portfolio, transaction) {
    await db.TB_PFOL_ST.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_ROLE.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await db.TB_PFOL_URL.destroy({ where: { PFOL_SN: pfolSn }, transaction });
    await this.insertPortfolioDetailsTest(pfolSn, portfolio, transaction);
  }
  async profileInsertTest(profile, userSn, transaction, userImg) {
    try {
      if (await db.TB_PF.findOne({ where: { USER_SN: userSn } })) {
        logger.error('해당 유저의 프로필이 이미 존재합니다.');
        return false;
      } else {
        const pf = await db.TB_PF.create({ PF_INTRO: profile.PF_INTRO, USER_SN: userSn }, { transaction });

        if (userImg) {
          const url = await minio.profileUpload(userImg, userSn);
          await db.TB_USER.update({ USER_IMG: url }, { where: { USER_SN: userSn }, transaction: transaction});
        }

        await this.insertProfileDetailsTest(pf.PF_SN, profile, transaction);
        return pf;
      }
    } catch (error) {
      throw error;
    }
  }

  async portfolioInsertTest(portfolio, pf, transaction, portfolioMedia, pfolCnt) {
    try {
      const pfol = await db.TB_PFOL.create({
        PFOL_NM: portfolio.PFOL_NM,
        START_DT: portfolio.START_DT,
        END_DT: portfolio.END_DT,
        PERIOD: portfolio.PERIOD,
        INTRO: portfolio.INTRO,
        MEM_CNT: portfolio.MEM_CNT,
        CONTRIBUTION: portfolio.CONTRIBUTION,
        SERVICE_STTS: portfolio.SERVICE_STTS,
        RESULT: portfolio.RESULT
      }, { transaction });

      await db.TB_PF_PFOL.create({ PF_SN: pf.PF_SN, PFOL_SN: pfol.PFOL_SN }, { transaction });

      if(portfolio.MEDIA){
        let mediaCnt = 0;
        for(const media of portfolio.MEDIA){
          if(!portfolioMedia[pfolCnt][mediaCnt]){
            const file = portfolioMedia[pfolCnt][mediaCnt];
            if(file){
              await minio.portfolioUpload(file, media.MAIN_YN, pfol.PFOL_SN, transaction);
            }
          }
          mediaCnt++;
        }
      }

      await this.insertPortfolioDetailsTest(pfol.PFOL_SN, portfolio, transaction);
      return pfol;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new profileService();
