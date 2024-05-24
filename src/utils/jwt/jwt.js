const jwt = require('jsonwebtoken');
require('dotenv').config();

class TokenService {
    constructor() {
        this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
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
            if (err) return res.sendStatus(403);
            req.userSn = USER_SN;
            next();
        });
    }
}

module.exports = new TokenService();
