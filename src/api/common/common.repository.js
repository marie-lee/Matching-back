const db = require("../../config/db/db");

const oneCmmnVal = async (cmmnCdType, cmmnCd) => {
        return await db.TB_CMMN_CD.findOne({
            where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD: cmmnCd},
            attributes: ['CMMN_CD_VAL'],
        })
}

module.exports = oneCmmnVal;