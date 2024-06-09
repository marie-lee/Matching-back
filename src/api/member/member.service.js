const bcrypt = require('bcryptjs');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');

class MemberService {
    async login(req, res) {
        const t = await db.transaction();
        try{
            const user = await db.TB_USER.findOne({ where: { USER_EMAIL: req.body.email, USER_PW: req.body.password } });
            console.log(user.USER_SN);
            if (!user) {
                logger.error('로그인 실패 : 유저 정보를 찾지 못했습니다.')
                return res.status(401).send('로그인 실패 : 유저 정보를 찾지 못했습니다.')
            }
            
            // const isPasswordValid = await bcrypt.compare(password, user.password);
            // if (!isPasswordValid) {
            //     throw new Error('Invalid password');
            // }

            const userSn = user.USER_SN; // 사용자 고유 식별자
            const refreshToken = jwt.generateRefreshToken(userSn);

            // 리프레시 토큰을 데이터베이스에 저장 (기존 토큰을 갱신)
            await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn }, transaction: t});
            await t.commit();
            return res.status(200).json({
                accessToken: jwt.generateAccessToken(userSn),
                refreshToken: refreshToken,
                USER_NM: user.USER_NM,
            });

        }
        catch(error){
            await t.rollback();
            throw error;
        }
    }

}

module.exports = new MemberService();