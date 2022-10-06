const express = require('express');
const cors = require('cors');
const socketIO = require('socket.io');
const { google } = require('googleapis');

const { NODE_ENV } = process.env;
const PORT = process.env.PORT || 8081;

const getClient = (credentials) => {
    const oauth2 = new google.auth.OAuth2({
        clientId:
            '172905821643-blr64u999b9v1vmqd6rovr3qvs03fcda.apps.googleusercontent.com',
        clientSecret: 'X9I9H8m90Fm3uHSi6I4cqYqL',
        redirectUri:
            NODE_ENV === 'production'
                ? 'https://microtube.netlify.app/callback'
                : 'http://localhost:8080/callback'
    });

    if (credentials) oauth2.setCredentials(credentials);

    return oauth2;
};

const getProfile = async (accessToken) => {
    const oauth2 = new google.auth.OAuth2();

    oauth2.setCredentials({ access_token: accessToken });

    const auth = google.oauth2({
        auth: oauth2,
        version: 'v2'
    });

    const { data } = await auth.userinfo.get();

    return data;
};

const app = express();

app.use(cors());

app.get('/authorization', async (_, res) => {
    const client = getClient();
    const url = await client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/youtube'
        ]
    });

    res.json({ url });
});

app.get('/token', async ({ query: { code } }, res) => {
    try {
        const client = getClient();
        const {
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                id_token: idToken
            }
        } = await client.getToken(code);

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

app.get('/refresh', async ({ query: { refreshToken } }, res) => {
    const client = getClient({ refresh_token: refreshToken });

    client.refreshAccessToken((error, tokens) => {
        if (error) {
            console.log(error);

            res.status(500).send({
                error: 'server_error',
                error_description: 'Error'
            });
        } else {
            const { id_token: idToken, access_token: accessToken } = tokens;

            res.json({ idToken, accessToken });
        }
    });
});

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, {
    cors: {
        origin:
            NODE_ENV === 'production'
                ? 'https://microtube.netlify.app'
                : 'http://localhost:8080'
    }
});

const connectedDevices = new Map();

const getRoomDevices = (roomId) => connectedDevices.get(roomId);

const syncDevices = (roomId) => {
    const devices = getRoomDevices(roomId);

    if (devices) {
        io.to(roomId).emit('devices:sync', [...devices.values()]);
    }
};

const addDevice = (device, roomId) => {
    const { deviceId } = device;
    const devices = getRoomDevices(roomId);

    if (devices.size === 0) {
        device.isMaster = true;
    }

    if (!devices.get(deviceId)) {
        devices.set(deviceId, device);

        syncDevices(roomId);
    }
};

const removeDevice = (deviceId, roomId) => {
    const devices = getRoomDevices(roomId);

    devices.delete(deviceId);

    if (devices.size === 1) {
        const [device] = devices.values();

        device.isMaster = true;
    }

    syncDevices(roomId);
};

const setMasterDevice = (deviceId, roomId) => {
    const devices = getRoomDevices(roomId);

    for (const id of devices.keys()) {
        devices.get(id).isMaster = id === deviceId;
    }

    syncDevices(roomId);
};

io.on('connection', (socket) =>
    socket.on('room', (roomId) => {
        socket.join(roomId);

        if (!getRoomDevices(roomId)) {
            connectedDevices.set(roomId, new Map());
        }

        socket.on('device:add', (device) => {
            addDevice(device, roomId);

            socket.on('disconnect', () =>
                removeDevice(device.deviceId, roomId)
            );
        });

        socket.on('device:active', (deviceId) =>
            setMasterDevice(deviceId, roomId)
        );

        socket.on('devices:sync', () => syncDevices(roomId));

        socket.on('player:sync', (data) =>
            socket.broadcast.to(roomId).emit('player:sync', data)
        );
    })
);
