const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const { QueryTypes } = require("sequelize");
const projectService = require('../projects/project.service');
const profileService = require('../profile/profile.service');
const {runPythonScript} = require("../../utils/matching/matching");

class matchingService {

    async selectMemberData(req,res){

        try {
            const pfPfol = await profileService.pfPfolSelectAll();
            const pfPfolJson = JSON.stringify(pfPfol);
            return res.status(200).send(pfPfolJson);
        } catch (error){
            throw error
        }

    }
    async selectMatchingData(req, res) {
        // const userSn = req.userSn.USER_SN;
        // const pjtSn = req.params.pjtSn;
        const userSn = 13
        const pjtSn = 13

        try {
            const pjtData = await projectService.myProject(userSn, pjtSn);
            // const pfPfol = await profileService.pfPfolSelectAll();

            const pjtJson = JSON.stringify(pjtData[0]);
            // const pfPfolJson = JSON.stringify(pfPfol);

            // 파이썬 실행
            runPythonScript(pjtJson, (error, result) => {
                if (error) {
                    throw error;
                }
                // 결과 처리
                // console.log(result);
            });
            // return res.status(200).send(pjtLists);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new matchingService();