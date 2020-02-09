const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 8081;

const server = express().listen(8081, () =>
    console.log(`Listening on ${PORT}`)
);

const io = socketIO(server);

const connectedDevices = {};

const syncDevices = (roomId) => {
    if (connectedDevices[roomId]) {
        io.to(roomId).emit('devices:sync', [
            ...connectedDevices[roomId].values()
        ]);
    }
};

const addDevice = (device, roomId) => {
    if (!connectedDevices[roomId] || !connectedDevices[roomId].size) {
        connectedDevices[roomId] = new Map();

        device.isMaster = true;
    }

    connectedDevices[roomId].set(device.deviceId, device);

    syncDevices(roomId);
};

const removeDevice = (deviceId, roomId) => {
    if (connectedDevices[roomId]) {
        connectedDevices[roomId].delete(deviceId);
    }

    syncDevices(roomId);
};

const setMasterDevice = (deviceId, roomId) => {
    for (const [id, data] of connectedDevices[roomId]) {
        connectedDevices[roomId].set(id, {
            ...data,
            isMaster: id === deviceId
        });
    }

    syncDevices(roomId);
};

io.on('connection', (socket) => {
    const broadcast = (room, ...params) =>
        socket.broadcast.to(room).emit(...params);

    socket.on('room', (roomId) => {
        socket.join(roomId);

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

        socket.on('player:current-time', (t) =>
            broadcast(roomId, 'player:current-time', t)
        );

        socket.on('player:loaded-fraction', (n) =>
            broadcast(roomId, 'player:loaded-fraction', n)
        );

        socket.on('player:volume', (v) =>
            broadcast(roomId, 'player:volume', v)
        );
    });
});
