const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const { QueryTypes } = require("sequelize");
const projectService = require('../projects/project.service');
const profileService = require('../profile/profile.service');
const {runPythonScript} = require("../../utils/matching/spawnMatching");
const mutex = require('../../utils/matching/Mutex');
class recommendationService {

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
        const pjtSn = req.params.pjtSn;

        try {
            await mutex.lock();
            // 파이썬 실행
            const pyResult = await runPythonScript(pjtSn);

            const dataJson = JSON.parse(pyResult);

            const sortedEntries = Object.entries(dataJson).sort((a, b) => b[1] - a[1]);
            // 정렬된 키-값 쌍 배열에서 키(key)만 가져와서 배열로 만듦
            const sortedKeys = sortedEntries.map(entry => parseInt(entry[0], 10));

            const userPfPfol = await profileService.pfPfolSelectAll(sortedKeys, req.userSn.USER_SN);

            const matchingResult = userPfPfol.map(profile => {
                const pfSn = profile.pfSn;
                const similarityScore = dataJson[pfSn.toString()];
                return {
                    ...profile,
                    similarityScore
                };
            });

            mutex.unlock(); // Mutex 해제
            return res.status(200).send(matchingResult);
        } catch (error) {
            mutex.unlock(); // Mutex 해제
            throw error;
        }
    }
}

module.exports = new recommendationService();