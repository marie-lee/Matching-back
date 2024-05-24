const express = require('express');
const router = express.Router();
const MemberService = require('./member.service');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await MemberService.login(email, password);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;