import "./App.css";
import io from "socket.io-client";
import { useState,useRef } from "react";
import Editor from "@monaco-editor/react";
import { useEffect } from "react";
import { v4 as uuid } from "uuid";

const socket = io("https://interviewpad.onrender.com");

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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

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
      setTypingUser(`${userName} is coding...`);
      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });

    socket.on("userMessage", ({ userName, message }) => {
      setMessages((prevMessages) => [...prevMessages, { userName, message }]);
    });

    socket.on("languageUpdate", (language) => {
      setLanguage(language);
    });

    socket.on("codeOutput", (data) => {
      setOutput(data);
    });

    socket.on("userMessages", (messages) => {
      setMessages(messages);
    });
    
    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("inputUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeOutput");
      socket.off("userMessages");
      socket.off("userMessage");
    };

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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

  const handleNewMessage = () => {
    if (newMessage.trim()) {
      socket.emit("newMessage", { roomId, userName, message: newMessage });
      setMessages((prevMessages) => [...prevMessages, { userName, message: newMessage }]);
      setNewMessage("");
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNewMessage();
    }
  }

  if(!joined) {
    return (
    <div className="join-container">
      <div className="join-header">
        <div className="logo-section">
          <h1 className="app-title">InterViewPad</h1>
          <p className="app-description">
            A real-time, collaborative coding environment designed specifically for technical interviews.
          </p>
        </div>
      </div>

      <div className="join-form">
        <div className="form-section">
          <h2>Join Interview Session</h2>
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your full name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="room-section">
            <div className="room-options">
              <div className="room-option">
                <h3>Create New Room</h3>
                <p>Start a new interview session</p>
                <button className="btn btn-primary" onClick={createRoomId}>
                  Generate Room ID
                </button>
              </div>
              
              <div className="divider">OR</div>
              
              <div className="room-option">
                <h3>Join Existing Room</h3>
                <p>Enter the room ID shared with you</p>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-input room-input"
                    placeholder="Enter Room ID (e.g., ABC123)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn btn-join" 
              onClick={joinRoom}
              disabled={!roomId.trim() || !userName.trim()}
            >
              Join Interview Room
            </button>
          </div>
        </div>

        <div className="features-preview">
          <h3>Features Available</h3>
          <ul className="features-list">
            <li>💻 Real-time collaborative coding</li>
            <li>🌐 Multiple programming languages</li>
            <li>▶️ Code execution and testing</li>
            <li>👥 Live user presence</li>
            <li>💬 Built-in communication</li>
          </ul>
        </div>
      </div>
    </div>
    );
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
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Chat</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                <div className="message-user">{msg.userName}</div>
                <div className="message-text">{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="chat-send-button"
              onClick={handleNewMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
  )
}

export default App
