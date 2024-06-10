const express = require('express');
const router = express.Router();
const statusService = require('./status.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');

router.get('/status', jwt.authenticateToken, async (req, res) => {
   try{
       return await statusService.status(req, res);
   }
   catch (error) {
       logger.error('현황 조회 중 에러 : '+error);
       return res.status(400).send('현황 조회 중 에러 : '+error);
   }
});

module.exports = router;