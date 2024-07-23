const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');
const {logger} = require('../../utils/logger');

router.post('/login', async (req, res) => {
    try {
        return await MemberService.login(req, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/registration/join',async (req,res)=>{
  try{
    return await MemberService.register(req,res,'local');
  }catch (error) {
    logger.error('회원가입 실패',error);
    return res.status(400).send('회원가입 실패 : ' + error);
  }
});
router.post('/registration/join/google',async (req,res)=>{
  try{
    return await MemberService.register(req,res,'google');
  }catch (error) {
    logger.error('회원가입 실패',error);
    return res.status(400).send('회원가입 실패 : ' + error);
  }
});

router.post('/registration/certification',async (req,res)=>{
  req.body.PURPOSE = 'register';
  try{
    return await MemberService.requestEmail(req,res);
  } catch (error) {
    logger.error('이메일 인증 요청 실패:', error);
    return res.status(400).send('이메일 인증 요청 실패: ' + error.message);
  }
});

router.post('/registration/confirmation',async (req,res)=>{
  req.body.PURPOSE = 'register';
  try{
    return await MemberService.verifyEmailCode(req,res);
  } catch (error) {
    logger.error('이메일 인증 확인 실패:', error);
    return res.status(400).send('이메일 인증 확인 실패: ' + error.message);
  }
});

router.post('/login/google',async (req,res)=>{
  try{
    return await MemberService.googleLogin(req,res);
  }catch (error){
    logger.error('구글 로그인 실패:',error);
    return res.status(400).send('구글 로그인 실패:'+error.message);
  }
});

router.post('/find/id',async (req,res)=>{
  try{
    return await MemberService.findId(req,res);
  } catch (error){
    logger.error('아이디 찾기 실패:',error);
    return res.status(400).send('아이디 찾기 실패:'+error.message);
  }
});

router.post('/find/pw', async (req, res) => {
  req.body.PURPOSE = 'reset_password';
  try {
    return await MemberService.findPassword(req, res);
  } catch (error) {
    logger.error('비밀번호 찾기 요청 실패:', error);
    return res.status(400).send('비밀번호 찾기 요청 실패: ' + error.message);
  }
});

router.post('/find/pw/certification', async (req, res) => {
  req.body.PURPOSE = 'reset_password';
  try {
    return await MemberService.verifyEmailCode(req, res);
  } catch (error) {
    logger.error('비밀번호 찾기 인증 실패:', error);
    return res.status(400).send('비밀번호 찾기 인증 실패: ' + error.message);
  }
});

router.post('/find/pw/confirmation', async (req, res) => {
  try {
    return await MemberService.confirmPasswordReset(req, res);
  } catch (error) {
    logger.error('비밀번호 재설정 실패:', error );
    return res.status(400).send('비밀번호 재설정 실패: ' + error.message);
  }
});

module.exports = router;
