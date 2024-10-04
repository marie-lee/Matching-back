class IssueDto {
    constructor({
                    pjtSn, userSn, issueSn, priority = null, status = null, mentions = null}) {
        this.PJT_SN = pjtSn;
        this.USER_SN = userSn;
        this.ISSUE_SN = issueSn;
        this.updateIssueData = new UpdateIssueDto({priority, status, mentions})
    }
    // validation(){
    //     if(this.updateIssueData.PRIORITY == null && this.updateIssueData.STATUS == null){
    //         throw Error('업데이트할 내용이 없습니다.');
    //     }
    // }
}

class UpdateIssueDto {
    constructor({priority = null, status = null , mentions = null}) {
        this.PRIORITY = priority;
        this.STATUS = status;
        if (mentions) {
            this.MENTIONS = {
                deleteMention: mentions.deleteMention || [],
                addMention: mentions.addMention || []
            };
        } else {
            this.MENTIONS = { deleteMention: [], addMention: [] };
        }
    }
}
module.exports = IssueDto;