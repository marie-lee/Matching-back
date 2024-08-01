const bcrypt = require('bcryptjs');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');
const nodemailer = require('nodemailer');
const MemberRepository = require('../member/member.repository');

class MemberService {
    async login(loginDto) {
      const transaction = await db.transaction();
      try{
        const user = await MemberRepository.findUserByEmail(loginDto.USER_EMAIL);
        if (!user) {
          return { message: '로그인 실패 : 유저 정보를 찾지 못했습니다.'};
        }
        const isPasswordValid = await bcrypt.compare(loginDto.USER_PW,user.USER_PW);
        if (!isPasswordValid) {
          return { message: '로그인 실패 : 잘못된 비밀번호입니다.'};
        }

        const userSn = user.USER_SN;
        const refreshToken = jwt.generateRefreshToken(userSn);

        await MemberRepository.updateUserRefreshToken(userSn,refreshToken,transaction);
        await transaction.commit();

        return {
          accessToken: jwt.generateAccessToken(userSn),
          refreshToken: refreshToken,
          USER_NM: user.USER_NM,
        };
      } catch(error){
        await transaction.rollback();
        throw error;
      }
    }

    async register(registerDto, type){
      const transaction = await db.transaction();
      try{
        const emailVerification = await MemberRepository.findEmailVerification(registerDto.USER_EMAIL,'register');
        if (!emailVerification) {
          return { message: '회원가입 실패: 이메일 인증이 완료되지 않았습니다.'};
        }
        const existingUser = await MemberRepository.findUserByEmail(registerDto.USER_EMAIL);
        if (existingUser) {
          return { message: '회원가입 실패: 이미 존재하는 이메일입니다.'};
        }
        let hashedPassword = '';
        if (type === 'local') {
          hashedPassword = await bcrypt.hash(registerDto.USER_PW, 10);
        }
        const newUser = await MemberRepository.createUser({
          USER_NM:registerDto.USER_NM,
          USER_EMAIL:registerDto.USER_EMAIL,
          USER_PW : hashedPassword,
          LOGIN_TYPE: type.toUpperCase(),
          PHONE:registerDto.PHONE,
          REFRESH_TOKEN: '',
          DEVICE_TOKEN: '',
          UID:'',
          CREATED_DT: new Date(),
          MODIFIED_DT: new Date(),
        },transaction);

        const userSn = newUser.USER_SN;
        const accessToken = jwt.generateAccessToken(userSn);
        const refreshToken = jwt.generateRefreshToken(userSn);

        await MemberRepository.updateUserRefreshToken(userSn,refreshToken,transaction);

        await transaction.commit();
        return{
          message: '회원가입 성공',
          accessToken: accessToken,
          refreshToken: refreshToken,
          USER_NM: newUser.USER_NM,
        };
      }catch (error){
        await transaction.rollback();
        throw error;
      }
    }

    async requestEmail(USER_EMAIL, PURPOSE) {
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
      subject: '프로젝트 매칭 플랫폼 인증코드',
      text: `인증번호 : ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    await MemberRepository.upsertEmailVerification({
      USER_EMAIL,
      VERIFICATION_CODE: verificationCode,
      VERIFIED: false,
      PURPOSE
    });

    return { message: 'Verification code sent to your email' };
  }

    async verifyEmailCode(USER_EMAIL, verificationCode, PURPOSE) {
    try {
      const record = await MemberRepository.findEmailVerification(USER_EMAIL, PURPOSE);

      if (!record || record.VERIFICATION_CODE !== verificationCode) {
        return { message: '이메일 인증 실패: 인증 코드가 일치하지 않습니다.'};
      }

      await MemberRepository.upsertEmailVerification({
        USER_EMAIL,
        VERIFICATION_CODE: verificationCode,
        VERIFIED: true,
        PURPOSE
      });

      return { message: '이메일 인증 성공' };
    } catch (error) {
      throw error;
    }
  }

    async findId(USER_NM, PHONE) {
    const user = await MemberRepository.findUserByNameAndPhone(USER_NM, PHONE);
    if (!user) {
      return { message: '아이디 찾기 실패: 유저 정보를 찾을 수 없습니다'};
    }
    return { USER_ID: user.USER_EMAIL };
  }

    async findPassword(USER_NM, USER_EMAIL) {
    const user = await MemberRepository.findUserByNameAndEmail(USER_NM, USER_EMAIL);
    if (!user) {
      throw new Error('비밀번호 찾기 실패: 유저 정보를 찾을 수 없습니다.');
    }

    return await this.requestEmail(USER_EMAIL, 'reset_password');
  }

    async confirmPasswordReset(USER_EMAIL, newPassword, confirmPassword) {
    const transaction = await db.transaction();
    try {
      if (newPassword !== confirmPassword) {
        return { message: '비밀번호 재설정 실패: 새 비밀번호와 확인 비밀번호가 일치하지 않습니다.'};
      }

      const record = await MemberRepository.findEmailVerification(USER_EMAIL, 'reset_password');
      if (!record || !record.VERIFIED) {
        return { message: '비밀번호 재설정 실패: 인증이 완료되지 않았습니다.'};
      }

      const user = await MemberRepository.findUserByEmail(USER_EMAIL);
      const isSamePassword = await bcrypt.compare(newPassword, user.USER_PW);
      if (isSamePassword) {
        return { message: '비밀번호 재설정 실패: 새 비밀번호가 기존 비밀번호와 같습니다.'};
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await MemberRepository.updateUserPassword(USER_EMAIL, hashedPassword, transaction);
      await MemberRepository.destroyEmailVerification(USER_EMAIL, 'reset_password', transaction);

      await transaction.commit();
      return { message: '비밀번호가 성공적으로 변경되었습니다.' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

    async googleLogin(email) {
    try {
      const user = await MemberRepository.findUserByEmail(email);

      if (user) {
        const userSn = user.USER_SN;
        const accessToken = jwt.generateAccessToken(userSn);
        const refreshToken = jwt.generateRefreshToken(userSn);

        await MemberRepository.updateUserRefreshToken(userSn, refreshToken);

        return {
          accessToken,
          refreshToken,
          USER_NM: user.USER_NM
        };
      } else {
        throw new Error('가입되지 않은 사용자입니다.');
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MemberService();
