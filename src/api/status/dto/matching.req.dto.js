class MatchingReqDto {
    constructor({ PJT_SN, USER_SN, PJT_ROLE_SN, REQ_STTS, REQ_SN }) {
        this.PJT_SN = PJT_SN;
        this.USER_SN = USER_SN;
        this.PJT_ROLE_SN = PJT_ROLE_SN;
        this.REQ_STTS = REQ_STTS;
        this.REQ_SN = REQ_SN;
    }

    validate() {
        const requiredFields = {
            PJT_SN: '프로젝트가 선택되지 않았습니다.',
            USER_SN: '회원 정보가 없습니다.',
        };
        if(this.REQ_STTS === 'REQ'){
            if(!this.PJT_ROLE_SN){
                throw '프로젝트 파트 일련번호가 없습니다.'
            }
        }
        for (const [field, message] of Object.entries(requiredFields)) {
            if (!this[field]) {
                throw new Error(message);
            }
        }
    }
}

module.exports = MatchingReqDto;
