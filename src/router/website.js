const express = require('express');

const router = express.Router();

const auth = require('../middlewares/auth-web');

const DiscordController = require('../controllers/DiscordController');

router.use(auth());

router.get('/', (req, res) => {
    res.render('home', {
        user: req.user,
        token: process.env.token,
    });
});

router.get('/account', (req, res) => {
    if(!req.user) {
        return res.redirect('/login');
    }
    res.render('account', {
        user: req.user,
    });
});

router.get('/login', DiscordController.redirect());
router.get('/login/callback', DiscordController.callback());

router.get('*', (req, res) => {
    res.send('404');
});

module.exports = router;