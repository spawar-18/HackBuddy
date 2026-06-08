const express = require('express');
const router = express.Router();
const { register, login, googleLogin, githubLogin } = require('../controller/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/github', githubLogin);

module.exports = router;
