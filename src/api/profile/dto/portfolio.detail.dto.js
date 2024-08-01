class PortfolioDetailDto {
  constructor({ userSn, pfolSn }) {
    this.userSn = userSn;
    this.pfolSn = pfolSn;
  }

  validate() {
    if (!this.userSn) {
      throw new Error('사용자 정보가 없습니다.');
    }
    if (!this.pfolSn) {
      throw new Error('포트폴리오 정보가 없습니다.');
    }
  }
}
module.exports=PortfolioDetailDto;
