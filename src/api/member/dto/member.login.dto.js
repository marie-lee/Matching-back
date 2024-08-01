class LoginDto{
  constructor(
    {
      email,
      password
    }
  ) {
    this.email = email;
    this.password = password;
  }

  validate(){
    if(!this.email){
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if(!this.password){
      throw new Error('비밀번호가 입력되지 않았습니다.');
    }
  }
}

module.exports = LoginDto;
