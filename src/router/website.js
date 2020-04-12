const express = require('express');
const router = express.Router();

const DiscordController = require('../controllers/DiscordController');

router.get('/', (req, res) => {
    res.render('home');
});

router.get('/account', (req, res) => {
    res.render('account');
});

router.get('/login', DiscordController.redirect());
router.get('/login/callback', DiscordController.callback());

router.get('*', (req, res) => {
    res.send('404');
});

module.exports = router;