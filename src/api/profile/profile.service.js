const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const minio = require('../../middleware/minio/minio.service');
const {QueryTypes} = require("sequelize");

class profileService {
    async profileUpload(req, res){
        const t = await db.transaction(); // 트랜잭션 시작
        try{
            // 프로필 입력
            const pf = await this.profileInsert(req.body.profile, req.userSn.USER_SN, t);

            // 포트폴리오 입력
            for (const portfolio of req.body.portfolios){
                await this.portfolioInsert(portfolio, pf, t);
            }
            await t.commit(); // 모든 작업이 성공하면 트랜잭션 커밋
            res.status(200).send('프로필 포트폴리오 입력 완료');
        }
        catch (error){
            await this.deleteFileFromMinio(req.body.profile, req.body.portfolios);
            await t.rollback(); // 에러 발생 시 트랜잭션 롤백
            throw error;
        }
    }

    async pfPfolSelect(req, res){
        const userSn = req.userSn.USER_SN;

        try {
            // 프로필 조회
            const profile = await this.profileSelect(userSn);
            console.log(profile)
            // 포트폴리오정보 조회
            const portfolioInfo = await this.portfolioInfoSelect(profile[0].PF_SN);

            const pfPfol = {profile: profile, portfolioInfo: portfolioInfo};

            return res.status(200).send(pfPfol);
        } catch (error){
            throw error;
        }
    }

    async profileSelect(userSn){
        const query = `SELECT  pf.PF_SN
                                    , usr.USER_SN
                                    , usr.USER_NM
                                    , usr.USER_IMG
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
                                    LEFT JOIN TB_CAREER cr ON cr.PF_SN = pf.PF_SN AND cr.DEL_YN = 'N'
                                    LEFT JOIN TB_PF_ST ps ON pf.PF_SN = ps.PF_SN
                                    LEFT JOIN TB_ST st ON ps.ST_SN = st.ST_SN
                                    LEFT JOIN TB_PF_INTRST pi ON pf.PF_SN = pi.PF_SN
                                    LEFT JOIN TB_INTRST i ON pi.INTRST_SN = i.INTRST_SN
                                    LEFT JOIN TB_PF_URL pu ON pf.PF_SN = pu.PF_SN
                                    LEFT JOIN TB_URL u ON pu.URL_SN = u.URL_SN AND u.DEL_YN = 'N'
                                WHERE pf.DEL_YN = 'N' AND usr.USER_SN = ${userSn}`;
        try{
            const profile = await db.query(query, {type: QueryTypes.SELECT});
            return profile;
        }
        catch (error) {
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
                                WHERE pp.PF_SN = ${pfSn}
                                GROUP BY pl.PFOL_SN
                                ORDER BY pl.START_DT ASC`;
        try{
            const portfolioInfo = await db.query(query, {type: QueryTypes.SELECT});
            return portfolioInfo;
        }
        catch (error) {
            throw error;
        }
    }

    async profileInsert(profile, userSn, transaction){
        try {
            // 프로필 생성
            const pf = await db.TB_PF.create({ PF_INTRO: profile.PF_INTRO, USER_SN: userSn}, { transaction });

            // 프로필 이미지 업데이트
            await db.TB_USER.update({USER_IMG: profile.USER_IMG}, {where : {USER_SN: userSn}, transaction: transaction});

            // 경력 입력
            for (const career of profile.CAREER) {
                await db.TB_CAREER.create({ CAREER_NM: career.CAREER_NM, ENTERING_DT: career.ENTERING_DT, QUIT_DT: career.QUIT_DT, PF_SN: pf.PF_SN }, { transaction });
            }

            // 스택 입력
            for (const stack of profile.STACK) {
                const [st, created] = await db.TB_ST.findOrCreate({
                    where: { ST_NM: stack.ST_NM },
                    defaults: { ST_NM: stack.ST_NM },
                    transaction: transaction
                });

                await db.TB_PF_ST.create({ PF_SN: pf.PF_SN, ST_SN: st.ST_SN, ST_LEVEL: stack.LEVEL }, { transaction });
            }

            // 관심사 입력
            for (const intrst of profile.INTRST) {
                const [intr, created] = await db.TB_INTRST.findOrCreate({
                    where: { INTRST_NM: intrst },
                    defaults: { INTRST_NM: intrst },
                    transaction: transaction
                });

                await db.TB_PF_INTRST.create({ PF_SN: pf.PF_SN, INTRST_SN: intr.INTRST_SN }, { transaction });
            }

            // URL 입력
            for (const url of profile.URL) {
                const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
                await db.TB_PF_URL.create({ PF_SN: pf.PF_SN, URL_SN: u.URL_SN }, { transaction });
            }

            return pf;
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

            // 스택 입력
            for (const stack of portfolio.STACK) {
                const [st, created] = await db.TB_ST.findOrCreate({
                    where: { ST_NM: stack.ST_NM },
                    defaults: { ST_NM: stack.ST_NM },
                    transaction: transaction
                });

                await db.TB_PFOL_ST.create({ PFOL_SN: pfol.PFOL_SN, ST_SN: st.ST_SN }, { transaction });
            }

            // 역할 입력
            for (const role of portfolio.ROLE) {
                const [r, created] = await db.TB_ROLE.findOrCreate({
                    where: { ROLE_NM: role },
                    defaults: { ROLE_NM: role },
                    transaction: transaction
                });

                await db.TB_PFOL_ROLE.create({ PFOL_SN: pfol.PFOL_SN, ROLE_SN: r.ROLE_SN }, { transaction });
            }

            // URL 입력
            for (const url of portfolio.URL) {
                const u = await db.TB_URL.create({ URL: url.URL, URL_INTRO: url.URL_INTRO }, { transaction });
                await db.TB_PFOL_URL.create({ PFOL_SN: pfol.PFOL_SN, URL_SN: u.URL_SN, RELEASE_YN: url.RELEASE_YN, OS: url.OS }, { transaction });
            }

            // 포트폴리오 미디어 입력
            for (const media of portfolio.MEDIA){
                await db.TB_PFOL_MEDIA.create({PFOL_SN: pfol.PFOL_SN, URL: media.URL, MAIN_YN: media.MAIN_YN}, {transaction});
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