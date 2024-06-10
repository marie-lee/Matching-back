const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');

router.post('/login', async (req, res) => {
    try {
        return await MemberService.login(req, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;