import "./App.css";
import io from "socket.io-client";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useEffect } from "react";
import { v4 as uuid } from "uuid";
const socket = io("http://localhost:3000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// your code here");
  const [copySuccess, setCopySuccess] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");
  const [input, setInput] = useState("");
  
  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", ({ code }) => {
      setCode(code);
    });
    
    socket.on("inputUpdate", (input) => {
      setInput(input);
    });

    socket.on("userTyping", (userName) => {
      setTypingUser(`${userName} is typing...`);
      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });

    socket.on("languageUpdate", (language) => {
      setLanguage(language);
    });

    socket.on("codeOutput", (data) => {
      setOutput(data);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("inputUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeOutput");
    };

  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom=()=>{
    if(roomId && userName){
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  }

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setInput("");
    setOutput("");
    setTypingUser("");
    setCode("// your code here");
    setUsers([]);
    setLanguage("javascript");
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit("codeChange", { roomId, code: value });
    socket.emit("typing", { roomId, userName });
  }

  const handleInputChange = (event) => {
    setInput(event.target.value);
    socket.emit("inputChange", { roomId, input: event.target.value });
  }

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  }

  const compileCode = () => {
    socket.emit("compileCode", { code, roomId, language, version,input });
  }

  const createRoomId = () => {
    const newRoomId = uuid();
    setRoomId(newRoomId);
  }

  if(!joined) {
    return <div className="join-container">
      <div className="join-form">
        <h1>Join room Code</h1>
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={createRoomId}>Create Room</button>
        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button onClick={joinRoom}> Join Room</button>
      </div>
    </div>
  }
  return (
      <div className="editor-container">
        <div className="sidebar">
          <div className="room-info">
            <h2>Room ID: {roomId}</h2>
            <button onClick={copyRoomId} className="copy-button">Copy Room Id</button>
            {copySuccess && <span className="copy-success">Copied!</span>}
          </div>
          <h3>Users in Room:</h3>
          <ul>
            {users.map((user, index) => (
              <li key={index} className="user-item">
                {user.slice(0,8)}
              </li>
            ))}
          </ul>
          <p className="typing-indicator">
            {typingUser}
          </p>
          <select 
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
        </div>
        <div className="editor-wrapper">
          <Editor
            height={"60%"}
            defaultLanguage={language}
            language={language}
            defaultValue="code"
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
          <textarea
            className="input-console"
            value={input}
            onChange={handleInputChange}
            placeholder="Input for your code (if any)..."
          />
          <button className="run-btn" onClick={compileCode}>
            Run Code
          </button>
          <textarea
            className="output-console"
            value={output}
            readOnly
            placeholder="Output will be displayed here..."
          />
        </div>
      </div>
  )
}

export default App
