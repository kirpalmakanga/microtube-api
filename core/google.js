const { google } = require('googleapis');

const { CLIENT_ID: clientId, CLIENT_SECRET: clientSecret } = process.env;

const getClient = ({ redirectUri, ...credentials } = {}) => {
    const oauth2 = new google.auth.OAuth2({
        clientId,
        clientSecret,
        redirectUri
    });

    if (credentials) oauth2.setCredentials(credentials);

    return oauth2;
};

exports.getAuthorizationUrl = async (origin) => {
    const client = getClient({ redirectUri: `${origin}/callback` });

    const url = await client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/youtube'
        ]
    });

    return url;
};

exports.getToken = async ({ origin, code }) => {
    const client = getClient({ redirectUri: `${origin}/callback` });

    const {
        tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: idToken
        }
    } = await client.getToken(code);

    return {
        accessToken,
        refreshToken,
        idToken
    };
};

exports.refreshAccessToken = ({ origin, refreshToken }) => {
    const client = getClient({
        redirectUri: `${origin}/callback`,
        refresh_token: refreshToken
    });

    return new Promise((resolve, reject) => {
        client.refreshAccessToken((error, tokens) => {
            if (error) {
                reject(error);
            } else {
                const { id_token: idToken, access_token: accessToken } = tokens;

                resolve({ idToken, accessToken });
            }
        });
    });
};

exports.getProfile = async (accessToken) => {
    const oauth2 = new google.auth.OAuth2();

    oauth2.setCredentials({ access_token: accessToken });

    const auth = google.oauth2({
        auth: oauth2,
        version: 'v2'
    });

    const { data } = await auth.userinfo.get();

    return data;
};
