class EmailVerificationDto{
  constructor(
    {
      USER_EMAIL,
      verificationCode
    }) {
    this.USER_EMAIL = USER_EMAIL;
    this.verificationCode = verificationCode;
  }

  validate(){
    if(!this.USER_EMAIL){
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if(!this.verificationCode){
      throw new Error('인증코드가 입력되지 않았습니다.');
    }
  }
}

module.exports = EmailVerificationDto;
