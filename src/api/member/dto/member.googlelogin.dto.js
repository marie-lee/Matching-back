const {throwError} = require("../../../utils/errors");
class googleLoginDto{
    constructor({userName = null, accessToken}) {
        this.userName = userName;
        this.accessToken = accessToken;
    }

    validate() {
        if(!this.accessToken) throwError('token이 없습니다.');
    }
}

module.exports = googleLoginDto