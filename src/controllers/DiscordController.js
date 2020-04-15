const fetch = require('node-fetch');
const btoa = require('btoa');
const jwt = require('jsonwebtoken');

const { Users } = require('../models');

const { generateAPIToken, generateKey } = require('../utils');

const uri = encodeURIComponent(`${process.env.host_url}/login/callback`);

function redirect() {
    return function(req, res) {
        return res.redirect(301, `https://discordapp.com/api/oauth2/authorize?client_id=${process.env.discord_client_id}&scope=identify&response_type=code&redirect_uri=${uri}`);
    };
}

function callback() {
    return async function(req, res) {
        if (!req.query.code) {
            return res.status(400).json({ status: 400, error: 'Bad Request', message: 'Code query missing' });
        }
        const authPayloadRq = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${req.query.code}&redirect_uri=${uri}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${process.env.discord_client_id}:${process.env.discord_client_secret}`)}`,
            },
        });
        const authPayload = await authPayloadRq.json();
        const userPayloadRq = await fetch('http://discordapp.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${authPayload.access_token}`,
            },
        });
        const userPayload = await userPayloadRq.json();
        const user = await Users.findOne({ where: { user_id: userPayload.id }, raw: true });

        if(user) {
            await Users.update({
                user_name: userPayload.username,
                user_avatar: userPayload.avatar,
                user_token: authPayload.access_token,
                user_token_refresh: authPayload.refresh_token,
            }, {
                where: { user_id: userPayload.id },
            });
        } else {
            const key = generateKey();
            const token = await generateAPIToken(userPayload.id, key, 100);

            await Users.create({
                user_id: userPayload.id,
                user_name: userPayload.username,
                user_avatar: userPayload.avatar,
                user_token: authPayload.access_token,
                user_token_refresh: authPayload.refresh_token,
                token_key: key,
                token,
                limit: 100,
            });
        }

        const key = await jwt.sign(authPayload.access_token, process.env.jwt_encryption_web);
        res.cookies.set('auth', key);

        return res.redirect('/account');
    };
}

module.exports = {
    redirect,
    callback,
};