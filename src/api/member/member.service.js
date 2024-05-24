const bcrypt = require('bcryptjs');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');

class MemberService {
    async login(email, password) {
        try{
            const user = await db.TB_USER.findOne({ where: { USER_EMAIL: email, USER_PW: password } });
            if (!user) {
                throw new Error('User not found');
            }
            
            // const isPasswordValid = await bcrypt.compare(password, user.password);
            // if (!isPasswordValid) {
            //     throw new Error('Invalid password');
            // }

            const userSn = user.USER_SN; // 사용자 고유 식별자
            const refreshToken = jwt.generateRefreshToken(userSn);

            // 리프레시 토큰을 데이터베이스에 저장 (기존 토큰을 갱신)
            await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn } });

            return {
                accessToken: jwt.generateAccessToken(userSn),
                refreshToken,
                USER_NM: user.USER_NM,
            };
        }
        catch(error){
            return error;
        }
    }

}

module.exports = new MemberService();