const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 8081;

const server = express().listen(PORT, () =>
    console.log(`Listening on ${PORT}`)
);

const io = socketIO(server, {
    cors: {
        origin: ['http://localhost:8080', 'https://microtube.netlify.*:*']
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
    const devices = getRoomDevices(roomId);

    if (devices.size === 0) {
        device.isMaster = true;
    }

    devices.set(device.deviceId, device);

    syncDevices(roomId);
};

const removeDevice = (deviceId, roomId) => {
    const devices = getRoomDevices(roomId);

    devices.delete(deviceId);

    if (devices.size === 1) {
        const [device] = [...devices.values()];

        devices.set(device.deviceId, { ...device, isMaster: true });
    }

    syncDevices(roomId);
};

const setMasterDevice = (deviceId, roomId) => {
    const devices = getRoomDevices(roomId);

    for (const [id, data] of devices) {
        devices.set(id, {
            ...data,
            isMaster: id === deviceId
        });
    }

    syncDevices(roomId);
};

io.on('connection', (socket) => {
    const broadcast = (roomId, ...params) =>
        socket.broadcast.to(roomId).emit(...params);

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
            broadcast(roomId, 'player:sync', data)
        );
    });
});
