import express from 'express';
import http from 'http';
const app = express();
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios';

const server = http.createServer(app);

const url = "https://interviewpad.onrender.com";

const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);

const io = new Server(server,{
    cors: {
        origin: '*',
    }
});

const rooms = new Map();

const getDefaultCode = () => ({
    javascript: "// Write your JavaScript code here\nconsole.log('Hello World!');",
    python: "# Write your Python code here\nprint('Hello World!')",
    java: "// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World!\");\n    }\n}",
    cpp: "// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello World!\" << endl;\n    return 0;\n}"
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let currentRoom = null;
    let currentUser = null;

    socket.on('join', ({roomId, userName}) => {
        if(currentRoom) {
            socket.leave(currentRoom);
            if(rooms.has(currentRoom)) {
                rooms.get(currentRoom).users.delete(currentUser);
                io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom).users));
            }
        }
        
        currentRoom = roomId;
        currentUser = userName;
        socket.join(currentRoom);
        
        if(!rooms.has(currentRoom)) {
            rooms.set(currentRoom, { 
                users: new Set(),
                code: getDefaultCode(), 
                language: "javascript", 
                output: "",
                input: "",
                messages: []
            });
        }
        
        const room = rooms.get(currentRoom);
        room.users.add(currentUser);

        socket.emit('languageUpdate', room.language);
        socket.emit('codeUpdate', { 
            code: room.code[room.language],
            language: room.language 
        });
        socket.emit('codeOutput', room.output);
        socket.emit('inputUpdate', room.input);
        socket.emit('userMessages', room.messages);
        io.to(currentRoom).emit('userJoined', Array.from(room.users));

        console.log(`User ${userName} joined room ${roomId}`);
    });

    socket.on('codeChange', ({ roomId, code }) => {
        if(rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.code[room.language] = code;
            
            socket.to(roomId).emit('codeUpdate', { 
                code: code,
                language: room.language 
            });
        }
    });

    socket.on('newMessage', ({ roomId,userName, message }) => {
        if(rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.messages.push({userName, message});
            socket.to(roomId).emit('userMessage', { userName: userName, message: message });
        }
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
            const room = rooms.get(roomId);
            
            room.language = language;
            
            io.to(roomId).emit("languageUpdate", language);
            
            io.to(roomId).emit('codeUpdate', { 
                code: room.code[language],
                language: language 
            });
            
        }
    });

    socket.on("compileCode", async ({code, roomId, language, version, input}) => {
        if(rooms.has(roomId)) {
            const room = rooms.get(roomId);
            
            try {
                console.log(`Compiling ${language} code for room ${roomId}`);
                
                const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
                    language: language,
                    version: version,
                    files: [
                        {
                            content: code
                        }
                    ],
                    stdin: input
                });
                
                room.output = response.data.run.output || "Code executed successfully (no output)";
                io.to(roomId).emit("codeOutput", room.output);
                
                
            } catch (error) {
                const errorMessage = `Error: ${error.message}`;
                room.output = errorMessage;
                io.to(roomId).emit("codeOutput", errorMessage);
            }
        }
    });

    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser) {
            const room = rooms.get(currentRoom);
            if(room) {
                room.users.delete(currentUser);
                io.to(currentRoom).emit("userJoined", Array.from(room.users));
            }

            socket.leave(currentRoom);
            console.log(`User ${currentUser} left room ${currentRoom}`);

            currentRoom = null;
            currentUser = null;
        }
    });

    socket.on('disconnect', () => {
        if(currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            room.users.delete(currentUser);
            
            io.to(currentRoom).emit('userJoined', Array.from(room.users));
            
            if(room.users.size === 0) {
                rooms.delete(currentRoom);
                console.log(`Room ${currentRoom} deleted (empty)`);
            }
            
            console.log(`User ${currentUser} disconnected from room ${currentRoom}`);
        }
    });
});

const port = process.env.PORT || 3000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, './frontend/dist')));

app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/dist', 'index.html'));
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
