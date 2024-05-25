const jwt = require('jsonwebtoken');
const {logger} = require('../../utils/logger');
require('dotenv').config();

class TokenService {
    constructor() {
        this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

        // 메서드 바인딩
        this.authenticateToken = this.authenticateToken.bind(this);
    }

    generateAccessToken(userSn) {
        return jwt.sign({ USER_SN: userSn }, this.accessTokenSecret, { expiresIn: '30m' });
    }

    generateRefreshToken(userSn) {
        return jwt.sign({ USER_SN: userSn }, this.refreshTokenSecret, { expiresIn: '7d' });
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret);
        } catch (err) {
            return null;
        }
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshTokenSecret);
        } catch (err) {
            return null;
        }
    }

    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) return res.sendStatus(401);

        jwt.verify(token, this.accessTokenSecret, (err, USER_SN) => {
            if (err) {
                logger.error("토큰 인증 에러 : " + err);
                return res.status(403).send("토큰 인증 에러 : " + err);
            }
            req.userSn = USER_SN;
            next();
        });
    }
}

module.exports = new TokenService();
