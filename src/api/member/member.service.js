const bcrypt = require('bcryptjs');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const nodemailer = require('nodemailer');
const {where} = require("sequelize");

class MemberService {
    async login(req, res) {
        const t = await db.transaction();
        try{
          const user = await db.TB_USER.findOne({ where: { USER_EMAIL: req.body.email } });
            if (!user) {
                logger.error('로그인 실패 : 유저 정보를 찾지 못했습니다.')
                return res.status(401).send('로그인 실패 : 유저 정보를 찾지 못했습니다.')
            }
            const isPasswordValid = await bcrypt.compare(req.body.password, user.USER_PW);
            if (!isPasswordValid) {
                logger.error('로그인 실패 : 잘못된 비밀번호입니다.');
                return res.status(401).send('로그인 실패 : 잘못된 비밀번호입니다.');
            }

            const userSn = user.USER_SN;
            const refreshToken = jwt.generateRefreshToken(userSn);

            // 리프레시 토큰을 데이터베이스에 저장 (기존 토큰을 갱신)
            await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn }, transaction: t});
            await t.commit();
            return res.status(200).json({
                accessToken: jwt.generateAccessToken(userSn),
                refreshToken: refreshToken,
                USER_NM: user.USER_NM,
            });

        }
        catch(error){
            await t.rollback();
            throw error;
        }
    }

    async register(req, res, type){
      const transaction = await db.transaction();
      try{
        const { USER_NM, USER_EMAIL, USER_PW, USER_PW_CONFIRM, PHONE } = req.body;

        if (!USER_NM) {
          logger.error('회원가입 실패: 이름을 입력해야 합니다.');
          return res.status(400).send('회원가입 실패: 이름을 입력해야 합니다.');
        }
        if (!USER_EMAIL) {
          logger.error('회원가입 실패: 이메일을 입력해야 합니다.');
          return res.status(400).send('회원가입 실패: 이메일을 입력해야 합니다.');
        }
        if (type === 'local') {
          if (!USER_PW) {
            logger.error('회원가입 실패: 비밀번호를 입력해야 합니다.');
            return res.status(400).send('회원가입 실패: 비밀번호를 입력해야 합니다.');
          }
          if (USER_PW !== USER_PW_CONFIRM) {
            logger.error('회원가입 실패: 비밀번호가 일치하지 않습니다.');
            return res.status(400).send('회원가입 실패: 비밀번호가 일치하지 않습니다.');
          }
        }
        if (!PHONE) {
          logger.error('회원가입 실패: 전화번호를 입력해야 합니다.');
          return res.status(400).send('회원가입 실패: 전화번호를 입력해야 합니다.');
        }

        const emailVerification = await db.TB_USER_EMAIL.findOne({ where: { USER_EMAIL, VERIFIED: true } });

        if (!emailVerification) {
          logger.error('회원가입 실패: 이메일 인증이 완료되지 않았습니다.');
          return res.status(400).send('회원가입 실패: 이메일 인증이 완료되지 않았습니다.');
        }

        const existingUser = await db.TB_USER.findOne({ where: { USER_EMAIL } });
        if (existingUser) {
          logger.error('회원가입 실패: 이미 존재하는 이메일입니다.');
          return res.status(400).send('회원가입 실패: 이미 존재하는 이메일입니다.');
        }
        let hashedPassword = '';
        if (type === 'local') {
          hashedPassword = await bcrypt.hash(USER_PW, 10);
        }
        const newUser = await db.TB_USER.create({
          USER_NM,
          USER_EMAIL,
          USER_PW : hashedPassword,
          LOGIN_TYPE: type === 'local' ? 'LOCAL' : 'GOOGLE',
          UID: '',
          PHONE,
          REFRESH_TOKEN: '',
          DEVICE_TOKEN: '',
          CREATED_DT: new Date(),
          MODIFIED_DT: new Date(),
        },{transaction});

        const userSn = newUser.USER_SN;
        const accessToken = jwt.generateAccessToken(userSn);
        const refreshToken = jwt.generateRefreshToken(userSn);

        await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn }, transaction: transaction });

        await transaction.commit();
        return res.status(200).json({
          message: '회원가입 성공',
          accessToken: accessToken,
          refreshToken: refreshToken,
          USER_NM: newUser.USER_NM,
        });
      }catch (error){
        await transaction.rollback();
        logger.error('회원가입 중 오류 발생:',error);
        return res.status(500).send('회원가입 중 오류가 발생했습니다');
      }
    }
    async requestEmail(req,res){
      try{
        const { USER_EMAIL, PURPOSE } = req.body;

        if (!USER_EMAIL) {
          logger.error('이메일 인증 요청 실패: 이메일이 제공되지 않았습니다.');
          return res.status(400).send('이메일 인증 요청 실패: 이메일이 제공되지 않았습니다.');
        }

        const email = await db.TB_USER.findOne({where:{USER_EMAIL}});
        if(PURPOSE === 'register' && email){
          logger.error('이메일 인증 요청 실패 : 이미 존재하는 이메일입니다.');
          return res.status(400).send('이메일 인증 요청 실패 : 이미 존재하는 이메일입니다');
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: USER_EMAIL,
          subject: '프로젝트 매칭 플랫폼 회원가입 인증코드',
          text: `인증번호 : ${verificationCode}`,
        };

        await transporter.sendMail(mailOptions);

        await db.TB_USER_EMAIL.upsert({
          USER_EMAIL: USER_EMAIL,
          VERIFICATION_CODE: verificationCode,
          VERIFIED: false,
          PURPOSE: PURPOSE
        });

        return res.status(200).json({ message: 'Verification code sent to your email' });
      } catch (error) {
        logger.error('이메일 인증 요청 중 오류 발생:', error);
        return res.status(500).send('이메일 인증 요청 중 오류가 발생했습니다.');
      }
    }

  async verifyEmailCode(req, res) {
    try {
      const { USER_EMAIL, verificationCode , PURPOSE} = req.body;

      if (!USER_EMAIL || !verificationCode) {
        logger.error('이메일 인증 실패: 이메일 또는 인증 코드가 제공되지 않았습니다.');
        return res.status(400).send('이메일 인증 실패: 이메일 또는 인증 코드가 제공되지 않았습니다.');
      }

      const record = await db.TB_USER_EMAIL.findOne({
        where: {
          USER_EMAIL: USER_EMAIL,
          VERIFICATION_CODE: verificationCode,
          PURPOSE: PURPOSE
        }
      });

      if (!record) {
        logger.error('이메일 인증 실패: 인증 코드가 일치하지 않습니다.');
        return res.status(400).send('이메일 인증 실패: 인증 코드가 일치하지 않습니다.');
      }

      await db.TB_USER_EMAIL.update({ VERIFIED: true }, { where: { USER_EMAIL: USER_EMAIL, PURPOSE: PURPOSE } });

      return res.status(200).json({ message: '이메일 인증 성공'});
    } catch (error) {
      logger.error('이메일 인증 코드 확인 중 오류 발생:', error);
      return res.status(500).send('이메일 인증 코드 확인 중 오류가 발생했습니다.');
    }
 }
  async findId(req,res){
      try{
        const{USER_NM,PHONE}=req.body;
        const user = await db.TB_USER.findOne({where:{USER_NM,PHONE}});
        if(!user){
          logger.error('아이디 찾기 실패: 유저 정보를 찾을 수 없습니다');
          return res.status(404).send('아이디 찾기 실패: 유저 정보를 찾을 수 없습니다');
        }
        return res.status(200).json({USER_ID:user.USER_EMAIL});
      }catch (error) {
        logger.error('아이디 찾기 중 오류 발생:', error);
        return res.status(500).send('아이디 찾기 중 오류가 발생했습니다.');

      }
  }
  async findPassword(req, res) {
    try {
      const { USER_NM, USER_EMAIL } = req.body;
      if (!USER_NM || !USER_EMAIL) {
        logger.error('비밀번호 찾기 요청 실패: 이름 또는 이메일이 제공되지 않았습니다.');
        return res.status(400).send('비밀번호 찾기 요청 실패: 이름 또는 이메일이 제공되지 않았습니다.');
      }
      const user = await db.TB_USER.findOne({ where: { USER_NM, USER_EMAIL } });
      if (!user) {
        logger.error('비밀번호 찾기 실패: 유저 정보를 찾을 수 없습니다.');
        return res.status(404).send('비밀번호 찾기 실패: 유저 정보를 찾을 수 없습니다.');
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: USER_EMAIL,
        subject: '프로젝트 매칭 플랫폼 비밀번호 인증번호',
        text: `인증번호 : ${verificationCode}`,
      };

      await transporter.sendMail(mailOptions);

      await db.TB_USER_EMAIL.upsert({
        USER_EMAIL: USER_EMAIL,
        VERIFICATION_CODE: verificationCode,
        VERIFIED: false,
        PURPOSE: 'reset_password'
      });

      return res.status(200).json({ message: 'Verification code sent to your email' });
    } catch (error) {
      logger.error('비밀번호 찾기 요청 중 오류 발생:', error);
      return res.status(500).send('비밀번호 찾기 요청 중 오류가 발생했습니다.');
    }
  }
  async confirmPasswordReset(req, res) {
    try {
      const { USER_EMAIL, newPassword, confirmPassword } = req.body;


      // 비밀번호 확인
      if (newPassword !== confirmPassword) {
        logger.error('비밀번호 재설정 실패: 새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
        return res.status(400).send('비밀번호 재설정 실패: 새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      }

      const record = await db.TB_USER_EMAIL.findOne({
        where: { USER_EMAIL, VERIFIED: true, PURPOSE: 'reset_password' }
      });

      if (!record) {
        logger.error('비밀번호 재설정 실패: 인증이 완료되지 않았습니다.');
        return res.status(400).send('비밀번호 재설정 실패: 인증이 완료되지 않았습니다.');
      }

      const user = await db.TB_USER.findOne({ where: { USER_EMAIL } });

      // 기존 비밀번호와 새 비밀번호가 같은지 확인
      const isSamePassword = await bcrypt.compare(newPassword, user.USER_PW);
      if (isSamePassword) {
        logger.error('비밀번호 재설정 실패: 새 비밀번호가 기존 비밀번호와 같습니다.');
        return res.status(400).send('비밀번호 재설정 실패: 새 비밀번호가 기존 비밀번호와 같습니다.');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.TB_USER.update({
        USER_PW: hashedPassword
      }, { where: { USER_EMAIL } });

      await db.TB_USER_EMAIL.destroy({ where: { USER_EMAIL, PURPOSE: 'reset_password' } });

      return res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
      logger.error('비밀번호 재설정 중 오류 발생:', error);
      return res.status(500).send('비밀번호 재설정 중 오류가 발생했습니다.');
    }
  }
  async googleLogin(req,res) {
    try {
      const {email} = req.body;

      const user = await db.TB_USER.findOne({where: {USER_EMAIL: email}});

      if (user) {
        const userSn = user.USER_SN;
        const accessToken = jwt.generateAccessToken(userSn);
        const refreshToken = jwt.generateRefreshToken(userSn);

        await db.TB_USER.update({REFRESH_TOKEN: refreshToken}, {where: {USER_SN: userSn}});

        return res.status(200).json({
          accessToken,
          refreshToken,
          USER_NM: user.USER_NM
        });
      } else {
        return res.status(200).json({message: '가입되지 않은 사용자'});
      }
    } catch (error) {
      logger.error('구글 로그인 중 오류발생:', error);
      return res.status(500).send('구글 로그인 중 오류발생');
    }
  }
}

module.exports = new MemberService();
