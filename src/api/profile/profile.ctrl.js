const express = require('express');
const router = express.Router();
const multer = require('multer');
require('dotenv').config();
const jwt = require('../../utils/jwt/jwt');
const profileService = require('../profile/profile.service');
const {logger} = require("../../utils/logger");
const ProfileCreateDto = require('../profile/dto/profile.create.dto');
const PortfolioDetailDto = require('../profile/dto/portfolio.detail.dto');
const upload = multer();

router.get('/profile', jwt.authenticateToken, async (req, res) => {
  try {
    const userSn = req.userSn.USER_SN;
    const result = await profileService.pfPfolSelect(userSn);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('내 프로필 및 포트폴리오 조회 실패', error);
    return res.status(400).json('내 프로필/포트폴리오 조회 중 에러 발생 에러 내용 : ' + error.message);
  }
});

router.post('/profile', jwt.authenticateToken, upload.fields([{ name: 'USER_IMG', maxCount: 1 }, { name: 'PORTFOLIO_MEDIA' }]), async (req, res) => {
  try {
    const userSn = req.userSn.USER_SN;
    const data = {
      profile: JSON.parse(req.body.data).profile,
      portfolios: JSON.parse(req.body.data).portfolios
    };
    const profileCreateDto = new ProfileCreateDto(data);
    // profileCreateDto.validate();
    const userImg = req.files.USER_IMG ? req.files.USER_IMG[0] : null;
    const portfolioMedia = req.files.PORTFOLIO_MEDIA? req.files.PORTFOLIO_MEDIA : null;
    await profileService.profileUpload(userSn, profileCreateDto.profile, profileCreateDto.portfolios, userImg, portfolioMedia);
    return res.status(200).json({ message: '프로필 및 포트폴리오 생성 완료' });
  } catch (error) {
    logger.error('프로필 및 포트폴리오 입력중 에러 발생 에러내용', error);
    return res.status(400).json('프로필 및 포트폴리오 입력중 에러 발생 에러내용 : ' + error.message);
  }
});
// 프로필, 포트폴리오 업로드 테스트 코드
router.post('/profile/test', jwt.authenticateToken, upload.any(), async (req, res) => {
  try {
    const userSn = req.userSn.USER_SN;
    const profile = req.body.profile; // 일반 데이터
    const portfolios = req.body.portfolios;
    const userImg = req.files.find(file => file.fieldname === 'profile[USER_IMG]'); // 사용자 이미지 찾기

    // 포트폴리오 미디어 파일 수집
    const portfolioMediaFiles = {};

    req.files.forEach(file => {
      const regex = /portfolios\[(\d+)\]\[MEDIA\]\[(\d+)\]\[file\]/;
      const match = file.fieldname.match(regex);

      if (match) {
        const portfolioIndex = match[1]; // 포트폴리오 인덱스
        const mediaIndex = match[2]; // 미디어 인덱스

        if (!portfolioMediaFiles[portfolioIndex]) {
          portfolioMediaFiles[portfolioIndex] = [];
        }

        portfolioMediaFiles[portfolioIndex][mediaIndex] = file; // 파일을 해당 인덱스에 저장
      }
    });
    // const profileCreateDto = new ProfileCreateDto(data);
    // profileCreateDto.validate();
    await profileService.profileUploadTest(userSn, profile, portfolios, userImg, portfolioMediaFiles);
    return res.status(200).json({ message: '프로필 및 포트폴리오 생성 완료' });
  } catch (error) {
    logger.error('프로필 및 포트폴리오 입력중 에러 발생 에러내용', error);
    return res.status(400).json('프로필 및 포트폴리오 입력중 에러 발생 에러내용 : ' + error.message);
  }
});

router.get('/profile/:pfolSn', jwt.authenticateToken, async (req, res) => {
  try {
    const portfolioDetailDto = new PortfolioDetailDto({
      userSn: req.userSn.USER_SN,
      pfolSn: req.params.pfolSn
    });
    portfolioDetailDto.validate();
    const portfolioDetail = await profileService.portfolioDetailSelect(portfolioDetailDto.userSn, portfolioDetailDto.pfolSn);
    return res.status(200).json(portfolioDetail);
  } catch (error) {
    logger.error('포트폴리오 상세 조회 중 에러 발생', error);
    return res.status(400).json('포트폴리오 상세 조회 중 에러 발생: ' + error.message);
  }
});

module.exports = router;
