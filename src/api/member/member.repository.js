const db = require('../../config/db/db');

// 사용자 이메일로 사용자 찾기
const findUserByEmail = async (email) => {
  return await db.TB_USER.findOne({ where: { USER_EMAIL: email } });
};

// 사용자 리프레시 토큰 업데이트
const updateUserRefreshToken = async (userSn, refreshToken, transaction) => {
    return await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn }, transaction });
};

// 사용자 리프레시 토큰 업데이트
const updateUserGoogleLogin = async (userSn, refreshToken, uid, transaction) => {
  return await db.TB_USER.update({ REFRESH_TOKEN: refreshToken, UID: uid }, { where: { USER_SN: userSn }, transaction });
};

// 사용자 데이터베이스에 저장
const createUser = async (userData, transaction) => {
    return await db.TB_USER.create(userData, { transaction });
};

const findEmailVerification = async (email, PURPOSE) => {
  return await db.TB_USER_EMAIL.findOne({
    where: {
      USER_EMAIL: email,
      PURPOSE: PURPOSE
    }
  });
};

const upsertEmailVerification = async (emailData) => {
  const { USER_EMAIL, PURPOSE } = emailData;
  return await db.TB_USER_EMAIL.upsert(emailData, {
    where: { USER_EMAIL, PURPOSE },
    returning: true  // 업데이트된 레코드를 반환합니다.
  });
};

// 사용자 이름과 전화번호로 사용자 찾기
const findUserByNameAndPhone = async (name, phone) => {
    return await db.TB_USER.findOne({ where: { USER_NM:name, PHONE:phone} });
};

// 사용자 이름과 이메일로 사용자 찾기
const findUserByNameAndEmail = async (name, email) => {
  return await db.TB_USER.findOne({ where: { USER_NM: name, USER_EMAIL: email } });
};

// 이메일 인증 코드 찾기
const findEmailVerificationCode = async (USER_EMAIL, verificationCode, PURPOSE) => {
  return await db.TB_USER_EMAIL.findOne({ where: { USER_EMAIL: USER_EMAIL, VERIFICATION_CODE: verificationCode, PURPOSE: PURPOSE } });
};

// 이메일 인증 상태 업데이트
const updateEmailVerificationStatus = async (USER_EMAIL, PURPOSE) => {
  return await db.TB_USER_EMAIL.update({ VERIFIED: true }, { where: { USER_EMAIL: USER_EMAIL, PURPOSE: PURPOSE } });
};

// 이메일 인증 데이터 삭제
const destroyEmailVerification = async (USER_EMAIL, PURPOSE) => {
  return await db.TB_USER_EMAIL.destroy({ where: { USER_EMAIL: USER_EMAIL, PURPOSE: PURPOSE } });
};

// 사용자 비밀번호 업데이트
const updateUserPassword = async (email, hashedPassword) => {
  return await db.TB_USER.update({ USER_PW: hashedPassword }, { where: { USER_EMAIL: email } });
};

const findUser = async (userSn) => {
  return await db.TB_USER.findOne({where: {USER_SN: userSn}});
};

module.exports = {
  findUserByEmail,
  findUserByNameAndPhone,
  findUserByNameAndEmail,
  updateUserGoogleLogin,
  createUser,
  updateUserRefreshToken,
  upsertEmailVerification,
  findEmailVerification,
  findEmailVerificationCode,
  updateEmailVerificationStatus,
  destroyEmailVerification,
  updateUserPassword,
  findUser
};
