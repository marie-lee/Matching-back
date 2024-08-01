class PasswordResetDto{
  constructor(
    {
      USER_EMAIL,
      newPassword,
      confirmPassword
    }
  ) {
    this.USER_EMAIL = USER_EMAIL;
    this.newPassword = newPassword;
    this.confirmPassword = confirmPassword;
  }

  validate(){
    if(!this.USER_EMAIL){
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if(!this.newPassword){
      throw new Error('새 비밀번호가 입력되지 않았습니다.');
    }
    if(this.newPassword !== this.confirmPassword){
      throw new Error('비밀번호가 일치하지 않습니다.')
    }
  }
}

module.exports = PasswordResetDto;
