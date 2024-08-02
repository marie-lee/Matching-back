class CreateIssueDto {
    constructor({
                    pjtSn, userSn,ticketSn, title, periority, contents,mentions, status
    }) {
        this.PJT_SN = pjtSn;
        this.USER_SN = userSn;
        this.TICKET_SN = ticketSn;
        this.TITLE = title;
        this.PERIORITY = periority;
        this.CONTENTS = contents;
        this.MENTIONS = mentions;
        this.STATUS = status;

    }

    validate(){
        const requiredFields = {
            PJT_SN: '프로젝트가 없습니다.',
            USER_SN: '회원 정보가 없습니다.',
            TICKET_SN: '티켓 정보가 없습니다.',
            TITLE: '이슈 타이틀이 입력되지 않았습니다.',
            CONTENTS: '이슈 내용이입력되지 않았습니다.',
        };
        for (const [field, message] of Object.entries(requiredFields)) {
            if (this[field] === '' || this[field] === null || this[field] === undefined) {
                throw new Error(message);
            }
        }
    }
}

module.exports = CreateIssueDto;