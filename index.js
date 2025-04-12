const express = require('express');
const cors = require('cors');
const {
    getAuthorizationUrl,
    getToken,
    refreshAccessToken,
    getProfile
} = require('./core/google');
const connectSocket = require('./core/socket');

require('dotenv').config();

const { PORT } = process.env;

const app = express();

app.use(
    cors({
        origin: [
            'http://localhost:8080',
            'https://microtube.dev',
            'https://microtube.netlify.app',
            'https://microtube-dev.netlify.app'
        ]
    })
);

app.get('/authorization', async ({ headers: { origin } }, res) => {
    const url = await getAuthorizationUrl(origin);

    res.json({ url });
});

app.get('/token', async ({ headers: { origin }, query: { code } }, res) => {
    try {
        const { accessToken, refreshToken, idToken } = await getToken({
            origin,
            code
        });

        const { id, name, picture } = await getProfile(accessToken);

        res.json({
            id,
            name,
            picture,
            accessToken,
            refreshToken,
            idToken
        });
    } catch (error) {
        console.log(error);

        res.status(500).send({
            error: 'server_error',
            error_description: 'Error'
        });
    }
});

app.get(
    '/refresh',
    async ({ headers: { origin }, query: { refreshToken } }, res) => {
        try {
            const tokens = await refreshAccessToken({ origin, refreshToken });

            res.json(tokens);
        } catch (error) {
            console.log(error);

            res.status(500).send({
                error: 'server_error',
                error_description: 'Error'
            });
        }
    }
);

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// connectSocket(server);

module.exports = app;
