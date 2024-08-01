class GoogleRegisterDto {
  constructor(
    {
      USER_NM,
      USER_EMAIL,
      PHONE
    }) {
    this.USER_NM = USER_NM;
    this.USER_EMAIL = USER_EMAIL;
    this.PHONE = PHONE;
  }

  validate() {
    if (!this.USER_NM) {
      throw new Error('이름이 입력되지 않았습니다.');
    }
    if (!this.USER_EMAIL) {
      throw new Error('이메일이 입력되지 않았습니다.');
    }
    if (!this.PHONE) {
      throw new Error('전화번호가 입력되지 않았습니다.');
    }
  }
}

module.exports = GoogleRegisterDto;
