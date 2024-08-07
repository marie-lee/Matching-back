class ProjectRateDto{
  constructor({ PJT_SN, TARGET_SN, RATER_SN, RATE_1, RATE_2, RATE_3, RATE_4, RATE_5, RATE_TEXT }) {
    this.PJT_SN = PJT_SN;
    this.TARGET_SN = TARGET_SN;
    this.RATER_SN = RATER_SN;
    this.RATE_1 = RATE_1;
    this.RATE_2 = RATE_2;
    this.RATE_3 = RATE_3;
    this.RATE_4 = RATE_4;
    this.RATE_5 = RATE_5;
    this.RATE_TEXT = RATE_TEXT;
  }

  validate(){
    if (this.RATE_1 == null) {
      throw new Error('1번 평가항목이 입력되지 않았습니다.');
    }
    if (this.RATE_2 == null) {
      throw new Error('2번 평가항목이 입력되지 않았습니다.');
    }
    if (this.RATE_3 == null) {
      throw new Error('3번 평가항목이 입력되지 않았습니다.');
    }
    if (this.RATE_4 == null) {
      throw new Error('4번 평가항목이 입력되지 않았습니다.');
    }
    if (this.RATE_5 == null) {
      throw new Error('5번 평가항목이 입력되지 않았습니다.');
    }
    if (!this.RATE_TEXT) {
      throw new Error('평가 텍스트가 입력되지 않았습니다.');
    }
  }
}

module.exports=ProjectRateDto;
