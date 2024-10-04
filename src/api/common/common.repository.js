const db = require("../../config/db/db");

const oneCmmnVal = async (cmmnCdType, cmmnCd) => {
        return await db.TB_CMMN_CD.findOne({
            where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD: cmmnCd},
            attributes: ['CMMN_CD_VAL'],
        })
}
const oneCmmnCd = async(cmmnCdType, cmmnCdVal)=>{
    return await db.TB_CMMN_CD.findOne({
        where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD_VAL: cmmnCdVal},
        attributes: ['CMMN_CD'],
    })
}
const createAlarm = async (data, transaction)=>{
    return await db.TB_ALARM.create(data,{transaction});
}
module.exports = {oneCmmnVal,oneCmmnCd,createAlarm};