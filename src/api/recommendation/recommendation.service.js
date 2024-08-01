const db = require('../../config/db/db');
const { logger } = require('../../utils/logger');
const { QueryTypes } = require("sequelize");
const projectService = require('../project/project.service');
const profileService = require('../profile/profile.service');
const {runPythonScript} = require("../../utils/matching/spawnMatching");
const mutex = require('../../utils/matching/Mutex');
class recommendationService {

    async selectMatchingData(user, pjt) {
        try {
            // 파이썬 실행
            const pyResult = await runPythonScript(pjt);

            const dataJson = JSON.parse(pyResult);

            const sortedEntries = Object.entries(dataJson).sort((a, b) => b[1] - a[1]);
            // 정렬된 키-값 쌍 배열에서 키(key)만 가져와서 배열로 만듦
            const sortedKeys = sortedEntries.map(entry => parseInt(entry[0], 10));

            const userPfPfol = await profileService.pfPfolSelectAll(sortedKeys, user);

            return userPfPfol.map(profile => {
                const pfSn = profile.pfSn;
                const similarityScore = dataJson[pfSn.toString()];
                return {
                    ...profile,
                    similarityScore
                };
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new recommendationService();