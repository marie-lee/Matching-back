const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const minio = require('../../middleware/minio/minio.service');

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