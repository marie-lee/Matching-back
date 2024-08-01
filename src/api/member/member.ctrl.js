const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');
const {logger} = require('../../utils/logger');
const { GoogleRegisterDto,RegisterDto, LoginDto, EmailVerificationDto, PasswordResetDto } = require('../member/dto');

//로컬 로그인
router.post('/login', async (req, res) => {
    try {
      const loginDto = new LoginDto(req.body);
      loginDto.validate();

      const result = await MemberService.login(loginDto);
      res.status(200).json(result);
    } catch (error) {
      logger.error('로그인 실패:', error);
      return res.status(400).json('로그인 실패:'+ error.message );
    }
});

//로컬 회원가입
router.post('/registration/join',async (req,res)=>{
  try{
    const registerDto = new RegisterDto(req.body);
    registerDto.validate();

    const result = await MemberService.register(registerDto,'local');
    res.status(200).json(result);
  }catch (error) {
    logger.error('회원가입 실패',error);
    return res.status(400).json('회원가입 실패 : ' + error.message);
  }
});

//구글 회원가입
router.post('/registration/join/google',async (req,res)=>{
  try{
    const googleRegisterDto = new GoogleRegisterDto(req.body);
    googleRegisterDto.validate();

    const result = await MemberService.register(googleRegisterDto,'google');
    res.status(200).json(result);
  }catch (error) {
    logger.error('회원가입 실패',error);
    return res.status(400).json('회원가입 실패 : ' + error.message);
  }
});

//구글 로그인
router.post('/login/google',async (req,res)=>{
  try{
    const {email}=req.body;

    const result = await MemberService.googleLogin(email);
    res.status(200).json(result);
  }catch (error){
    logger.error('구글 로그인 실패:',error);
    return res.status(400).json('구글 로그인 실패:'+error.message);
  }
});

//이메일 인증 요청
router.post('/registration/certification',async (req,res)=>{
  try {
    const { USER_EMAIL } = req.body;
    if (!USER_EMAIL) {
      throw new Error('이메일이 입력되지 않았습니다.');
    }

    const result = await MemberService.requestEmail(USER_EMAIL,'register');
    res.status(200).json(result);
  } catch (error) {
    logger.error('이메일 인증 확인 실패:', error);
    return res.status(400).json( '이메일 인증 확인 실패:'+ error.message );
  }
});

//이메일 인증 확인
router.post('/registration/confirmation',async (req,res)=>{
  try{
    const emailVerificationDto = new EmailVerificationDto(req.body);
    emailVerificationDto.validate();

    const result = await MemberService.verifyEmailCode(emailVerificationDto.USER_EMAIL, emailVerificationDto.verificationCode, 'register');
    res.status(200).json(result);
  } catch (error) {
    logger.error('이메일 인증 확인 실패:', error);
    return res.status(400).json('이메일 인증 확인 실패:'+ error.message );
  }
});

//아이디 찾기
router.post('/find/id',async (req,res)=>{
  try{
    const { USER_NM, PHONE } = req.body;

    const result = await MemberService.findId(USER_NM, PHONE);
    res.status(200).json(result);
  } catch (error){
    logger.error('아이디 찾기 실패:',error);
    return res.status(400).json('아이디 찾기 실패:'+error.message);
  }
});

//비밀번호 찾기 요청
router.post('/find/pw', async (req, res) => {
  try {
    const { USER_NM, USER_EMAIL } = req.body;

    const result = await MemberService.findPassword(USER_NM, USER_EMAIL);
    res.status(200).json(result);
  } catch (error) {
    logger.error('비밀번호 찾기 요청 실패:', error);
    return res.status(400).send('비밀번호 찾기 요청 실패: ' + error.message);
  }
});

//비밀번호 찾기 인증 확인
router.post('/find/pw/certification', async (req, res) => {
  try {
    const emailVerificationDto = new EmailVerificationDto(req.body);
    emailVerificationDto.validate();

    const result = await MemberService.verifyEmailCode(emailVerificationDto.USER_EMAIL, emailVerificationDto.verificationCode, 'reset_password');
    res.status(200).json(result);
  } catch (error) {
    logger.error('비밀번호 찾기 인증 실패:', error);
    res.status(400).json('비밀번호 찾기 인증 실패:'+ error.message);
  }
});

//비밀번호 찾기 재설정
router.post('/find/pw/confirmation', async (req, res) => {
    try {
      const passwordResetDto = new PasswordResetDto(req.body);
      passwordResetDto.validate();

      const result = await MemberService.confirmPasswordReset(passwordResetDto.USER_EMAIL, passwordResetDto.newPassword, passwordResetDto.confirmPassword);
      res.status(200).json(result);
    } catch (error) {
      logger.error('비밀번호 재설정 실패:', error);
      res.status(400).json('비밀번호 재설정 실패:'+ error.message );
    }
});

module.exports = router;
