const db = require('../../config/db/db');

// 사용자 이메일로 사용자 찾기
const findUserByEmail = async (email) => {
  return await db.TB_USER.findOne({ where: { USER_EMAIL: email } });
};

// 사용자 리프레시 토큰 업데이트
const updateUserRefreshToken = async (userSn, refreshToken, transaction) => {
    return await db.TB_USER.update({ REFRESH_TOKEN: refreshToken }, { where: { USER_SN: userSn }, transaction });
};

// 사용자 데이터베이스에 저장
const createUser = async (userData, transaction) => {
    return await db.TB_USER.create(userData, { transaction });
};

// 인증된 이메일 찾기
const findEmailVerification = async (email) => {
    return await db.TB_USER_EMAIL.findOne({ where: { USER_EMAIL:email, VERIFIED: true } });
};

// 이메일 인증 데이터베이스에 저장
const upsertEmailVerification = async (emailData) => {
    return await db.TB_USER_EMAIL.upsert(emailData);
};

// 사용자 이름과 전화번호로 사용자 찾기
const findUserByNameAndPhone = async (name, phone) => {
    return await db.TB_USER.findOne({ where: { USER_NM:name, PHONE:phone} });
};

// 사용자 이름과 이메일로 사용자 찾기
const findUserByNameAndEmail = async (name, email) => {
    return await db.TB_USER.findOne({ where: { USER_NM:name, USER_EMAIL:email } });
};

// 이메일 인증 코드 찾기
const findEmailVerificationCode = async (email, verificationCode, purpose) => {
    return await db.TB_USER_EMAIL.findOne({ where: { USER_EMAIL:email, VERIFICATION_CODE: verificationCode, PURPOSE:purpose } });
};

// 이메일 인증 상태 업데이트
const updateEmailVerificationStatus = async (email, purpose) => {
    return await db.TB_USER_EMAIL.update({ VERIFIED: true }, { where: { USER_EMAIL:email, PURPOSE:purpose } });
};

// 이메일 인증 데이터 삭제
const destroyEmailVerification = async (email, purpose) => {
    return await db.TB_USER_EMAIL.destroy({ where: { USER_EMAIL:email, PURPOSE:purpose } });
};

// 사용자 비밀번호 업데이트
const updateUserPassword = async (email, hashedPassword) => {
    return await db.TB_USER.update({ USER_PW: hashedPassword }, { where: { USER_EMAIL:email } });
};

module.exports = {
  findUserByEmail,
  findUserByNameAndPhone,
  findUserByNameAndEmail,
  createUser,
  updateUserRefreshToken,
  upsertEmailVerification,
  findEmailVerification,
  findEmailVerificationCode,
  updateEmailVerificationStatus,
  destroyEmailVerification,
  updateUserPassword,
};
