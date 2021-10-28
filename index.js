const express = require('express');
const socketIO = require('socket.io');

const { NODE_ENV } = process.env;
const PORT = process.env.PORT || 8081;

const server = express().listen(PORT, () =>
    console.log(`Listening on ${PORT}`)
);

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
