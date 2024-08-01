class LoginDto{
  constructor(
    {
      email,
      password
    }
  ) {
    this.USER_EMAIL = email;
    this.USER_PW = password;
  }

  validate(){
    if(!this.USER_EMAIL){
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if(!this.USER_PW){
      throw new Error('비밀번호가 입력되지 않았습니다.');
    }
  }
}

module.exports = LoginDto;
