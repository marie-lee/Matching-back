const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");
const {throwError} = require("../../utils/errors");
const {getProjectIntro} = require("../project/project.service");
const {error} = require("winston");
const moment = require("moment")

const oneCmmnVal = async (cmmnCdType, cmmnCd) => {
  try {
    return await db.TB_CMMN_CD.findOne({
      where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD: cmmnCd},
      attributes: ['CMMN_CD_VAL'],
    })
  } catch (error) {
    throw error;
  }
}

const formatDt = (dt) => {
  return moment(dt).format('YYYY-MM-DD HH:mm:ss');
};

module.exports = {oneCmmnVal, formatDt};