class ProfileCreateDto {
  constructor({ profile, portfolios }) {
    this.profile = profile;
    this.portfolios = portfolios;
  }

  validate() {
    if (!this.profile && !this.portfolios) {
      throw new Error('프로필과 포트폴리오 데이터가 없습니다.');
    }
    if (this.profile) {
      if (!this.profile.PF_INTRO) {
        throw new Error('한 줄 소개가 입력되지 않았습니다.');
      }
      if (!this.profile.STACK) {
        throw new Error('스킬이 입력되지 않았습니다.');
      }
      if (!this.profile.INTRST) {
        throw new Error('관심 분야가 입력되지 않았습니다.');
      }
    }
    if (this.portfolios) {
      for (const portfolio of this.portfolios) {
        if (!portfolio.PFOL_NM) {
          throw new Error('프로젝트명이 입력되지 않았습니다.');
        }
        if (!portfolio.START_DT || !portfolio.END_DT) {
          throw new Error('프로젝트 기간이 입력되지 않았습니다.');
        }
        if (!portfolio.INTRO) {
          throw new Error('프로젝트 소개가 입력되지 않았습니다.');
        }
        if (!portfolio.MEM_CNT) {
          throw new Error('프로젝트 인원이 입력되지 않았습니다.');
        }
        if (!portfolio.CONTRIBUTION) {
          throw new Error('프로젝트 기여도가 입력되지 않았습니다.');
        }
        if (!portfolio.STACK || portfolio.STACK.length === 0) {
          throw new Error('프로젝트 스택이 입력되지 않았습니다.');
        }
        if (!portfolio.ROLE || portfolio.ROLE.length === 0) {
          throw new Error('프로젝트 역할이 입력되지 않았습니다.');
        }
        if (!portfolio.SERVICE_STTS) {
          throw new Error('프로젝트 서비스 상태가 입력되지 않았습니다.');
        }
      }
    }
  }
}

module.exports=ProfileCreateDto;
