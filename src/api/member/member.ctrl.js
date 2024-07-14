const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');
const {logger} = require('../../utils/logger');
const passport = require('passport');

router.post('/login', async (req, res) => {
    try {
        return await MemberService.login(req, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/registeration/join',async (req,res)=>{
  try{
    return await MemberService.register(req,res);
  }catch (error) {
    logger.error('회원가입 실패',error);
    return res.status(400).send('회원가입 실패 : ' + error);
  }
});

router.post('/registeration/certification',async (req,res)=>{
  try{
    return await MemberService.requestEmail(req,res);
  } catch (error) {
    logger.error('이메일 인증 요청 실패:', error);
    return res.status(400).send('이메일 인증 요청 실패: ' + error.message);
  }
});

router.post('/registeration/confirmation',async (req,res)=>{
  try{
    return await MemberService.verifyEmailCode(req,res);
  } catch (error) {
    logger.error('이메일 인증 확인 실패:', error);
    return res.status(400).send('이메일 인증 확인 실패: ' + error.message);
  }
});

router.get('/login/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/registeration/join/google', passport.authenticate('google', { session: false, failureRedirect: '/login' }), async (req, res) => {
  return await MemberService.handleGoogleCallback(req, res);
});

router.post('/find/id',async (req,res)=>{
  try{
    return await MemberService.findId(req,res);
  } catch (error){
    logger.error('아이디 찾기 실패:',error);
    return res.status(400).send('아이디 찾기 실패:'+error.message);
  }
});

module.exports = router;
