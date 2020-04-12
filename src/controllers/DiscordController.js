const fetch = require('node-fetch')
const btoa = require('btoa')

const User = require('../models/User')
const uri = encodeURIComponent(`${process.env.host_url}/login/callback`);

function redirect () {
    return function (req, res) {
        return res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${process.env.discord_client_id}&scope=identify&response_type=code&redirect_uri=${uri}`);
    } 
}

function callback () {
    return async function (req, res) {
        if (!req.query.code) {
            return res.status(400).json({ status: 400, error: 'Bad Request', message: 'Code query missing'})
        }
        const payloadRq = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${req.query.code}&redirect_uri=${uri}`,{
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${process.env.discord_client_id}:${process.env.discord_client_secret}`)}`,
            },
        });
        const payload = await payloadRq.json();
        const userRq = await fetch('http://discordapp.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${payload.access_token}`,
            },
        })
        const user = await userRq.json();
        await User.upsert({
            user_id: user.id,
            user_name: user.username,
            user_avatar: user.avatar,
            user_token: payload.access_token,
            user_token_refresh: payload.refresh_token,
            limit: 100,
        }, { fields: ['user_name', 'user_avatar', 'user_token', 'user_token_refresh'] });
        
        return res.redirect('/')
    }
}

module.exports = {
    redirect,
    callback
}