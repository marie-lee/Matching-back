const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');

router.post('/login', async (req, res) => {
    try {
        await MemberService.login(res, req);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;