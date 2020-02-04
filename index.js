const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 8081;

const server = express().listen(8081, () =>
    console.log(`Listening on ${PORT}`)
);

const io = socketIO(server);

const connectedDevices = {};

const syncDevices = (userId) => {
    if (connectedDevices[userId]) {
        io.to(userId).emit('devices:sync', [
            ...connectedDevices[userId].values()
        ]);
    }
};

const addDevice = (device, userId) => {
    if (!connectedDevices[userId] || !connectedDevices[userId].size) {
        connectedDevices[userId] = new Map();

        device.isMaster = true;
    }

    connectedDevices[userId].set(device.deviceId, device);

    syncDevices(userId);
};

const removeDevice = (deviceId, userId) => {
    if (connectedDevices[userId]) {
        connectedDevices[userId].delete(deviceId);
    }

    syncDevices(userId);
};

const setMasterDevice = (deviceId, userId) => {
    for (const [id, data] of connectedDevices[userId]) {
        connectedDevices[userId].set(id, {
            ...data,
            isMaster: id === deviceId
        });
    }

    syncDevices(userId);
};

io.on('connection', (socket) => {
    socket.on('room', (userId) => {
        socket.join(userId);

        socket.on('device:add', (device) => {
            addDevice(device, userId);

            socket.on('disconnect', () =>
                removeDevice(device.deviceId, userId)
            );
        });

        socket.on('device:active', (deviceId) =>
            setMasterDevice(deviceId, userId)
        );

        socket.on('devices:sync', () => syncDevices(userId));
    });
});
