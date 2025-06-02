import express from 'express';
import http from 'http';
const app = express();
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios';
import { log } from 'console';

const server = http.createServer(app);

const io = new Server(server,{
    cors: {
        origin: '*',
    }
});

const rooms=new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let currentRoom = null;
    let currentUser = null;

    socket.on('join',({roomId, userName}) => {
        if(currentRoom) {
            socket.leave(currentRoom);
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom).users));
        }
        currentRoom = roomId;
        currentUser = userName;
        socket.join(currentRoom);
        if(!rooms.has(currentRoom)) {
            rooms.set(currentRoom, { users: new Set() , code: "//your code here" ,language: "javascript", output: "" ,input: ""});
        }
        rooms.get(currentRoom).users.add(currentUser);

        socket.emit('codeUpdate',{ code:rooms.get(currentRoom).code});
        socket.emit('languageUpdate', rooms.get(currentRoom).language);
        socket.emit('codeOutput', rooms.get(currentRoom).output);
        socket.emit('inputUpdate', rooms.get(currentRoom).input);
        io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom).users));
    });

    socket.on('codeChange', ({ roomId, code }) => {
        if(rooms.has(roomId)) {
            rooms.get(roomId).code = code;
        }
        socket.to(roomId).emit('codeUpdate',{code});
    });
    
    socket.on('inputChange', ({ roomId, input }) => {
        if(rooms.has(roomId)) {
            rooms.get(roomId).input = input;
        }
        socket.to(roomId).emit('inputUpdate', input);
    });

    socket.on("typing", ({ roomId, userName }) => {
        socket.to(roomId).emit("userTyping", userName);
    });

    socket.on("languageChange", ({ roomId, language }) => {
        if(rooms.has(roomId)) {
            rooms.get(roomId).language = language;
        }
        socket.to(roomId).emit("languageUpdate", language);
    });

    socket.on("compileCode", async ({code,roomId,language,version,input}) => {
        if(rooms.has(roomId)) {
            const room= rooms.get(roomId);
            const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
                language: language,
                version: version,
                files: [
                    {
                        content: code
                    }
                ],
                stdin: input
            })
            room.output = response.data.run.output;
            io.to(roomId).emit("codeOutput",room.output);
        }
    });

    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));

            socket.leave(currentRoom);

            currentRoom = null;
            currentUser = null;
        }
    });

    socket.on('disconnect',() => {
        if(currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom).users));
            if(rooms.get(currentRoom).users.size === 0) {
                rooms.delete(currentRoom);
            }
            console.log(`User ${currentUser} disconnected from room ${currentRoom}`);
        }
    })
});

// const __dirname = path.resolve();

// app.use(express.static(path.join(__dirname, 'frontend/dist')));

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
// });

const port=process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});