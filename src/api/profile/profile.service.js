const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const minio = require('../../middleware/minio/minio.service');
const {QueryTypes} = require("sequelize");
const {runPfPfolToVec} = require("../../utils/matching/spawnVectorization");
const mutex = require('../../utils/matching/Mutex');
class profileService {
    async profileUpload(req, res){
        const data = req.body;
        const userSn = req.userSn.USER_SN
        const t = await db.transaction(); // 트랜잭션 시작
        try{
            if(!data.profile && !data.portfolios){
                return res.status(400).send('프로필과 포트폴리오 데이터가 없습니다.')
            }
            else if(data.profile && !data.portfolios){
                // 프로필 입력
                const pf = await this.profileInsert(req.body.profile, userSn, t);
                if(pf){
                    await t.commit(); // 모든 작업이 성공하면 트랜잭션 커밋
                    res.status(200).send('프로필 입력 완료');
                    await this.toVectorPfPfol(userSn)
                }
                else{
                    await t.rollback();
                    res.status(304).send('이미 등록된 프로필 입니다.');
                }
            }
            else if(data.profile && data.portfolios){
                // 프로필 입력
                const pf = await this.profileInsert(req.body.profile, userSn, t);
                if(pf){
                    // 포트폴리오 입력
                    for (const portfolio of req.body.portfolios) {
                        await this.portfolioInsert(portfolio, pf, t);
                    }
                    await t.commit(); // 모든 작업이 성공하면 트랜잭션 커밋
                    res.status(200).send('프로필 포트폴리오 입력 완료');
                    await this.toVectorPfPfol(userSn)
                }
                else{
                    await t.rollback();
                    res.status(304).send('이미 등록된 프로필 입니다.');
                }
            }

        }
        catch (error){
            await this.deleteFileFromMinio(req.body.profile, req.body.portfolios);
            await t.rollback(); // 에러 발생 시 트랜잭션 롤백
            logger.error('프로필 포트폴리오 등록 중 에러 발생:', error);
            throw error;
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

    async pfPfolSelect(userSn, res){

        try {
            // 프로필 조회
            const profile = await this.profileSelect(userSn);
            // 포트폴리오정보 조회
            const portfolioInfo = await this.portfolioInfoSelect(profile[0].PF_SN);

            const pfPfol = {profile: profile, portfolioInfo: portfolioInfo};

            return res.status(200).send(pfPfol);
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
            await mutex.lock();
            const pfPfolData = await db.query(query, {type: QueryTypes.SELECT});
            const pfPfolJson = JSON.stringify(pfPfolData);
            await runPfPfolToVec(pfPfolJson);
            mutex.unlock(); // Mutex 해제
        } catch (error){
            mutex.unlock(); // Mutex 해제
            throw error;
        }
    }

    async portfolioInfoSelect(pfSn) {
        const query = `SELECT pl.PFOL_SN
                                    , pl.PFOL_NM
                                    , pl.START_DT
                                    , pl.END_DT
                                    , pl.PERIOD
                                    , JSON_ARRAYAGG( DISTINCT
                                        JSON_OBJECT(
                                            'ST_NM', st.ST_NM
                                        )
                                    ) AS stack
                                    , pm.URL  AS IMG
                                FROM TB_PFOL pl
                                LEFT JOIN TB_PF_PFOL pp ON pl.PFOL_SN = pp.PFOL_SN
                                LEFT JOIN TB_PFOL_ST ps ON ps.PFOL_SN = pp.PFOL_SN
                                LEFT JOIN TB_ST st ON st.ST_SN = ps.ST_SN
                                LEFT JOIN TB_PFOL_MEDIA pm ON pl.PFOL_SN = pm.PFOL_SN AND pm.MAIN_YN = 1
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

    async profileInsert(profile, userSn, transaction){
        try {
            if (!profile.PF_INTRO) {
              throw new Error('한 줄 소개가 입력되지 않았습니다.');
            }
            if (!profile.STACK) {
              throw new Error('스킬이 입력되지 않았습니다.');
            }
            if (!profile.INTRST) {
              throw new Error('관심 분야가 입력되지 않았습니다.');
            }
            if(await db.TB_PF.findOne({where : {USER_SN: userSn}})){
                logger.error('해당 유저의 프로필이 이미 존재합니다.');
                return false;
            }
            else {
                // 프로필 생성
                const pf = await db.TB_PF.create({PF_INTRO: profile.PF_INTRO, USER_SN: userSn}, {transaction});

                // 프로필 이미지 업데이트
                await db.TB_USER.update({USER_IMG: profile.USER_IMG}, {
                    where: {USER_SN: userSn},
                    transaction: transaction
                });

                if(profile.CAREER){
                    // 경력 입력
                    for (const career of profile.CAREER) {
                        await db.TB_CAREER.create({
                            CAREER_NM: career.CAREER_NM,
                            ENTERING_DT: career.ENTERING_DT,
                            QUIT_DT: career.QUIT_DT,
                            PF_SN: pf.PF_SN
                        }, {transaction});
                    }
                }

                if(profile.STACK){
                    // 스택 입력
                    for (const stack of profile.STACK) {
                        const [st, created] = await db.TB_ST.findOrCreate({
                            where: {ST_NM: stack.ST_NM},
                            defaults: {ST_NM: stack.ST_NM},
                            transaction: transaction
                        });

                        await db.TB_PF_ST.create({
                            PF_SN: pf.PF_SN,
                            ST_SN: st.ST_SN,
                            ST_LEVEL: stack.LEVEL
                        }, {transaction});
                    }
                }

                if(profile.INTRST){
                    // 관심사 입력
                    for (const intrst of profile.INTRST) {
                        const [intr, created] = await db.TB_INTRST.findOrCreate({
                            where: {INTRST_NM: intrst},
                            defaults: {INTRST_NM: intrst},
                            transaction: transaction
                        });

                        await db.TB_PF_INTRST.create({PF_SN: pf.PF_SN, INTRST_SN: intr.INTRST_SN}, {transaction});
                    }
                }

                if(profile.URL){
                    // URL 입력
                    for (const url of profile.URL) {
                        const u = await db.TB_URL.create({URL: url.URL, URL_INTRO: url.URL_INTRO}, {transaction});
                        await db.TB_PF_URL.create({PF_SN: pf.PF_SN, URL_SN: u.URL_SN}, {transaction});
                    }
                }

                return pf;
            }
        } catch (error) {
            logger.error("프로필 입력 중 에러발생:", error);
            throw error;
            }
    }

    async portfolioInsert(portfolio, pf, transaction){
        try{
            // 포트폴리오 생성
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

            // 포트폴리오 - 프로필 연결
            await db.TB_PF_PFOL.create({PF_SN:pf.PF_SN, PFOL_SN:pfol.PFOL_SN}, { transaction });

            if(portfolio.STACK){
                // 스택 입력
                for (const stack of portfolio.STACK) {
                    const [st, created] = await db.TB_ST.findOrCreate({
                        where: {ST_NM: stack.ST_NM},
                        defaults: {ST_NM: stack.ST_NM},
                        transaction: transaction
                    });

                    await db.TB_PFOL_ST.create({PFOL_SN: pfol.PFOL_SN, ST_SN: st.ST_SN}, {transaction});
                }
            }

            if(portfolio.ROLE){
                // 역할 입력
                for (const role of portfolio.ROLE) {
                    const [r, created] = await db.TB_ROLE.findOrCreate({
                        where: {ROLE_NM: role},
                        defaults: {ROLE_NM: role},
                        transaction: transaction
                    });

                    await db.TB_PFOL_ROLE.create({PFOL_SN: pfol.PFOL_SN, ROLE_SN: r.ROLE_SN}, {transaction});
                }
            }

            if(portfolio.URL){
                // URL 입력
                for (const url of portfolio.URL) {
                    const u = await db.TB_URL.create({URL: url.URL, URL_INTRO: url.URL_INTRO}, {transaction});
                    await db.TB_PFOL_URL.create({
                        PFOL_SN: pfol.PFOL_SN,
                        URL_SN: u.URL_SN,
                        RELEASE_YN: url.RELEASE_YN,
                        OS: url.OS
                    }, {transaction});
                }
            }

            if(portfolio.MEDIA){
                // 포트폴리오 미디어 입력
                for (const media of portfolio.MEDIA) {
                    await db.TB_PFOL_MEDIA.create({
                        PFOL_SN: pfol.PFOL_SN,
                        URL: media.URL,
                        MAIN_YN: media.MAIN_YN
                    }, {transaction});
                }
            }

            return pfol;
        }
        catch (error){
            logger.error("포트폴리오 입력 중 에러발생:", error);
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
            for(const portfolio of portfolios){
                if (portfolio.MEDIA){
                    for(const media of portfolio.MEDIA){
                        if(media.URL && media.URL.trim() !== ''){
                            const fileName = this.fileUrlParsing(media.URL);
                            await minio.deleteFile(fileName);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }
}

module.exports = new profileService();
