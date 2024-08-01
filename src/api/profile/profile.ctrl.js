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
    const profileCreateDto = new ProfileCreateDto(req.body);
    profileCreateDto.validate();
    const userImg = req.files['USER_IMG'] ? req.files['USER_IMG'][0] : null;
    const portfolioMedia = req.files['PORTFOLIO_MEDIA'] || [];
    await profileService.profileUpload(userSn, profileCreateDto.profile, profileCreateDto.portfolios, userImg, portfolioMedia);
    return res.status(200).json({ message: '프로필 및 포트폴리오 생성 완료' });
  } catch (error) {
    logger.error('프로필 및 포트폴리오 입력중 에러 발생 에러내용', error);
    return res.status(400).json('프로필 및 포트폴리오 입력중 에러 발생 에러내용 : ' + error.message);
  }
});

router.put('/profile', jwt.authenticateToken, upload.fields([{ name: 'USER_IMG', maxCount: 1 }, { name: 'PORTFOLIO_MEDIA' }]), async (req, res) => {
  try {
    const userSn = req.userSn.USER_SN;
    const profileCreateDto = new ProfileCreateDto(req.body);
    profileCreateDto.validate();
    const userImg = req.files['USER_IMG'] ? req.files['USER_IMG'][0] : null;
    const portfolioMedia = req.files['PORTFOLIO_MEDIA'] || [];
    await profileService.profileModify(userSn, profileCreateDto.profile, profileCreateDto.portfolios, userImg, portfolioMedia);
    return res.status(200).json({ message: '프로필 및 포트폴리오 수정 완료' });
  } catch (error) {
    logger.error('프로필 및 포트폴리오 수정중 에러 발생 에러내용', error);
    return res.status(400).json('프로필 및 포트폴리오 수정중 에러 발생 에러내용 : ' + error.message);
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
