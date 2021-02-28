const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 8081;

const server = express().listen(PORT, () =>
    console.log(`Listening on ${PORT}`)
);

const io = socketIO(server, {
<<<<<<< HEAD
    origins: 'localhost:8080 microtube.netlify.*:*',
});

const connectedDevices = new Map();

const syncDevices = (roomId) => {
    if (connectedDevices.get(roomId)) {
        io.to(roomId).emit('devices:sync', [
            ...connectedDevices.get(roomId).values(),
        ]);
=======
    cors: {
        origin: [
            'http://localhost:8080',
            'https://microtube.netlify.app:*',
            'https://microtube.netlify.com:*'
        ]
    }
});

const connectedDevices = new Map();

const getRoomDevices = (roomId) => connectedDevices.get(roomId);

const syncDevices = (roomId) => {
    const devices = getRoomDevices(roomId);

    if (devices) {
        io.to(roomId).emit('devices:sync', [...devices.values()]);
>>>>>>> release/1.3.0
    }
};

const addDevice = (device, roomId) => {
<<<<<<< HEAD
    if (!connectedDevices.get(roomId)?.size) {
        connectedDevices.set(roomId, new Map());
=======
    const devices = getRoomDevices(roomId);
>>>>>>> release/1.3.0

    if (devices.size === 0) {
        device.isMaster = true;
    }

<<<<<<< HEAD
    connectedDevices.get(roomId).set(device.deviceId, device);
=======
    devices.set(device.deviceId, device);
>>>>>>> release/1.3.0

    syncDevices(roomId);
};

const removeDevice = (deviceId, roomId) => {
<<<<<<< HEAD
    connectedDevices.get(roomId)?.delete(deviceId);
=======
    const devices = getRoomDevices(roomId);

    devices.delete(deviceId);

    if (devices.size === 1) {
        const [device] = [...devices.values()];

        devices.set(device.deviceId, { ...device, isMaster: true });
    }
>>>>>>> release/1.3.0

    syncDevices(roomId);
};

const setMasterDevice = (deviceId, roomId) => {
<<<<<<< HEAD
    for (const [id, data] of connectedDevices.get(roomId)) {
        connectedDevices.get(roomId)?.set(id, {
=======
    const devices = getRoomDevices(roomId);

    for (const [id, data] of devices) {
        devices.set(id, {
>>>>>>> release/1.3.0
            ...data,
            isMaster: id === deviceId,
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
