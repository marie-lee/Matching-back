class EmailVertificationDto{
  constructor(
    {
      USER_EMAIL,
      vertificationCode
    }) {
    this.USER_EMAIL = USER_EMAIL;
    this.vertificationCode = vertificationCode;
  }

  validate(){
    if(!this.USER_EMAIL){
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if(!this.vertificationCode){
      throw new Error('인증코드가 입력되지 않았습니다.');
    }
  }
}

module.exports = EmailVertificationDto;
