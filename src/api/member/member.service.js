const bcrypt = require('bcryptjs');
const jwt = require('../../utils/jwt/jwt');
const db = require('../../config/db/db');
const nodemailer = require('nodemailer');
const MemberRepository = require('../member/member.repository');
const userRepository = require("./member.repository");
const {getUserInfo} = require('../../middleware/firebase/firebase');

class MemberService {
    async login(loginDto) {
      const transaction = await db.transaction();
      try{
        const user = await MemberRepository.findUserByEmail(loginDto.USER_EMAIL);
        if (!user) {
          return {
            status: 400,
            message: '로그인 실패 : 유저 정보를 찾지 못했습니다.'
          };
        }
        const isPasswordValid = await bcrypt.compare(loginDto.USER_PW,user.USER_PW);
        if (!isPasswordValid) {
          return {
            status: 400,
            message: '로그인 실패 : 잘못된 비밀번호입니다.'};
        }

        const userSn = user.USER_SN;
        const refreshToken = jwt.generateRefreshToken(userSn);

        await MemberRepository.updateUserRefreshToken(userSn,refreshToken,transaction);
        await transaction.commit();

        return {
          status: 200,
          accessToken: jwt.generateAccessToken(userSn),
          refreshToken: refreshToken,
          USER_NM: user.USER_NM,
        };
      } catch(error){
        await transaction.rollback();
        throw error;
      }
    }

    async register(registerDto){
      const transaction = await db.transaction();
      try{
        const existingUser = await MemberRepository.findUserByEmail(registerDto.USER_EMAIL);
        if (existingUser) {
          return {
            status: 400,
            message: '회원가입 실패: 이미 존재하는 이메일입니다.'
          };
        }
        const emailVerification = await MemberRepository.findEmailVerification(registerDto.USER_EMAIL,'register');
        if (!emailVerification) {
          return {
            status: 400,
            message: '회원가입 실패: 이메일 인증이 완료되지 않았습니다.'
          };
        }
        let hashedPassword = await bcrypt.hash(registerDto.USER_PW, 10);
        const newUser = await MemberRepository.createUser({
          USER_NM:registerDto.USER_NM,
          USER_EMAIL:registerDto.USER_EMAIL,
          USER_PW : hashedPassword,
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
          status: 200,
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

      let subject, text;

      switch(PURPOSE) {
        case 'register':
          subject = 'Hoit! 회원가입 이메일 인증';
          text = `안녕하세요.\nHoit! 회원가입에 필요한 이메일 인증번호입니다.\n\n인증번호: ${verificationCode}\n\n이메일 인증을 완료해주십시오.`;
          break;
        case 'reset_password':
          subject = 'Hoit! 비밀번호 재설정 인증';
          text = `안녕하세요.\nHoit! 비밀번호 재설정에 필요한 인증번호입니다.\n\n인증번호: ${verificationCode}\n\n인증 후 새로운 비밀번호를 설정해주세요.`;
          break;
        default:
          throw new Error('Invalid email purpose');
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: USER_EMAIL,
        subject: subject,
        text: text,
      };

      await transporter.sendMail(mailOptions);

      await MemberRepository.upsertEmailVerification({
        USER_EMAIL,
        VERIFICATION_CODE: verificationCode,
        VERIFIED: false,
        PURPOSE
      });

      return {
        status: 200,
        message: 'Verification code sent to your email'
      };
  }

    async verifyEmailCode(USER_EMAIL, verificationCode, PURPOSE) {
    try {
      const record = await MemberRepository.findEmailVerification(USER_EMAIL, PURPOSE);

      if (!record || record.VERIFICATION_CODE !== verificationCode) {
        return {
          status: 400,
          message: '이메일 인증 실패: 인증 코드가 일치하지 않습니다.'
        };
      }

      await MemberRepository.upsertEmailVerification({
        USER_EMAIL,
        VERIFICATION_CODE: verificationCode,
        VERIFIED: true,
        PURPOSE
      });

      return {
        status: 200,
        message: '이메일 인증 성공'
      };
    } catch (error) {
      throw error;
    }
  }

    async findId(USER_NM, PHONE) {
    const user = await MemberRepository.findUserByNameAndPhone(USER_NM, PHONE);
    if (!user) {
      return {
        status: 400,
        message: '아이디 찾기 실패: 유저 정보를 찾을 수 없습니다'
      };
    }
    return {
      status: 200,
      USER_ID: user.USER_EMAIL
    };
  }

    async findPassword(USER_NM, USER_EMAIL) {
    const user = await MemberRepository.findUserByNameAndEmail(USER_NM, USER_EMAIL);
    if (!user) {
      return {
        status: 400,
        message: '비밀번호 찾기 실패: 유저 정보를 찾을 수 없습니다'
      };
    }

    return await this.requestEmail(USER_EMAIL, 'reset_password');
  }

    async confirmPasswordReset(USER_EMAIL, newPassword, confirmPassword) {
    const transaction = await db.transaction();
    try {
      if (newPassword !== confirmPassword) {
        return {
          status: 400,
          message: '비밀번호 재설정 실패: 새 비밀번호와 확인 비밀번호가 일치하지 않습니다.'
        };
      }

      const record = await MemberRepository.findEmailVerification(USER_EMAIL, 'reset_password');
      if (!record || !record.VERIFIED) {
        return {
          status: 400,
          message: '비밀번호 재설정 실패: 인증이 완료되지 않았습니다.'};
      }

      const user = await MemberRepository.findUserByEmail(USER_EMAIL);
      const isSamePassword = await bcrypt.compare(newPassword, user.USER_PW);
      if (isSamePassword) {
        return {
          status: 400,
          message: '비밀번호 재설정 실패: 새 비밀번호가 기존 비밀번호와 같습니다.'
        };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await MemberRepository.updateUserPassword(USER_EMAIL, hashedPassword, transaction);
      await MemberRepository.destroyEmailVerification(USER_EMAIL, 'reset_password', transaction);

      await transaction.commit();
      return {
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async googleLogin(data) {
    const transaction = await db.transaction();
    try {

      const userData = await getUserInfo(data.accessToken);
      if(!userData){
        return {
          status: 401,
          message: '유효하지 않은 token입니다.'
        }
      }
      const user = await MemberRepository.findUserByEmail(userData.email);

      if (user) {
        const userSn = user.USER_SN;
        const accessToken = jwt.generateAccessToken(userSn);
        const refreshToken = jwt.generateRefreshToken(userSn);

        await MemberRepository.updateUserGoogleLogin(userSn, refreshToken, userData.uid, transaction);

        await transaction.commit()

        return {
          status: 200,
          accessToken,
          refreshToken,
          USER_NM: user.USER_NM
        };
      } else {
        return {
          status: 400,
          message: '가입되지 않은 사용자입니다.'
        }
      }
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
  }

  async emailCheck(email){
    try {
      const emailUser = await userRepository.findUserByEmail(email);
      if(!emailUser){
        return {
          status: 200,
          message: '미가입된 이메일 입니다.'
        }
      }
      else return {
        status: 400,
        message: '이미 가입된 이메일 입니다.'
      }
    }
    catch (error){
      throw error;
    }
  }
}

module.exports = new MemberService();
