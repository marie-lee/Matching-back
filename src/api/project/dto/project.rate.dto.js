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
}

module.exports=ProjectRateDto;
