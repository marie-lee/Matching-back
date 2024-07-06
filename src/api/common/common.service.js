const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");
const {throwError} = require("../../utils/errors");
const {getProjectIntro} = require("../projects/project.service");
const {error} = require("winston");

class commonService {

  async oneCmmnVal(cmmnCdType, cmmnCd){
    console.log(cmmnCd)
    try{
      return await db.TB_CMMN_CD.findOne({
        where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD: cmmnCd},
        attributes: ['CMMN_CD_VAL'],
      })
    } catch (error){
      throw error;
    }
  }
}

module.exports = new commonService();