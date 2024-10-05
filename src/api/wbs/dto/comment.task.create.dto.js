class CreateTaskCommentDto {
  constructor({
                pjtSn, userSn, taskSn, commentData}) {
    console.log(commentData)
    this.PJT_SN = pjtSn;
    this.CREATER_SN = userSn;
    this.TICKET_SN = taskSn;
    this.TEXT = commentData.TEXT;
    this.MENTIONS = commentData.MENTIONS || [];
  }


  validate(){
    const requiredFields = {
      PJT_SN: '프로젝트가 없습니다.',
      CREATER_SN: '회원 정보가 없습니다.',
      TICKET_SN: '업무 정보가 없습니다.',
      TEXT: '댓글 내용이 없습니다.',
    };
    for (const [field, message] of Object.entries(requiredFields)) {
      if (this[field] === '' || this[field] === null || this[field] === undefined) {
        throw new Error(message);
      }
    }
  }
}
module.exports = CreateTaskCommentDto;
