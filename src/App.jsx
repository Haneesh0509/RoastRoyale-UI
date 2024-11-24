import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import idleImage from "./assets/idle-1.jpeg";
import listenImage from "./assets/listen-1.jpeg";
import thinkImage from "./assets/think-1.jpeg";
import roastImage from "./assets/roast-1.jpeg";
import { FaPaperPlane, FaMicrophone, FaWindowMinimize, FaPhoneAlt } from "react-icons/fa";
import "./App.css";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
    const [messages, setMessages] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [botState, setBotState] = useState("idle");
    const [isMinimized, setIsMinimized] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    const chatBoxRef = useRef(null);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            setSelectedVoice(availableVoices.find((voice) => voice.lang === "en-US"));
        };
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const speak = (text) => {
        if (!selectedVoice) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;
        speechSynthesis.speak(utterance);
    };

    const handleUserMessage = async (message) => {
        if (message.trim() === "") return;
        let userInput = message;
        setUserMessage("");
        setMessages((prev) => [...prev, { sender: "user", content: message }]);
        setBotState("think");

        try {
            const response = await axios.post("http://192.168.5.5:3000/api/model", { user: userInput });
            const botResponse = response.data.response;
            setMessages((prev) => [...prev, { sender: "bot", content: botResponse }]);
            setBotState("roast");
            speak(botResponse);
        } catch (error) {
            console.error("Error communicating with the model:", error);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", content: "Oops! Something went wrong." },
            ]);
        } finally {
            setBotState("idle");
            setUserMessage("");
        }
    };

    const startListening = () => {
        if (isListening) return;
        setIsListening(true);
        setBotState("listen");
        recognition.start();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserMessage(transcript);
        handleUserMessage(transcript);
        setIsListening(false);
        setBotState("idle");
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setBotState("idle");
    };

    recognition.onend = () => {
        setIsListening(false);
        setBotState("idle");
        if (autoSpeakEnabled) {
            startListening();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleUserMessage(userMessage);
        }
    };

    const toggleMinimize = () => {
        setIsMinimized((prev) => !prev);
    };

    const toggleAutoSpeak = () => {
        if (autoSpeakEnabled) window.location.reload();
        setAutoSpeakEnabled((prev) => !prev);
    };

    useEffect(() => {
        if (autoSpeakEnabled) {
            startListening();
        } else {
            recognition.stop();
        }
    }, [autoSpeakEnabled]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const renderBotAnimation = () => {
        switch (botState) {
            case "idle":
                return <img src={idleImage} alt="Idle bot" />;
            case "listen":
                return <img src={listenImage} alt="Listening bot" />;
            case "think":
                return <img src={thinkImage} alt="Thinking bot" />;
            case "roast":
                return <img src={roastImage} alt="Roasting bot" />;
            default:
                return <img src={idleImage} alt="Idle bot" />;
        }
    };

    return (
        <div className="App">
            {autoSpeakEnabled && (
                <div className="call-interface">
                    <div className="call-header">
                        <button className="end-call-button" onClick={toggleAutoSpeak}>
                            <FaPhoneAlt size={40} />
                        </button>
                    </div>
                    <div className="call-body">
                        <div className="bot-animation">{renderBotAnimation()}</div>
                        <div className="call-status">
                            {botState === "listen" && <p>Listening...</p>}
                            {botState === "think" && <p>Thinking...</p>}
                            {botState === "roast" && <p>Responding...</p>}
                            {botState === "idle" && <p>Idle...</p>}
                        </div>
                    </div>
                </div>
            )}
            <div className="app-wrapper">
                <div className="content-container">
                    <div className="bot-image-container">{renderBotAnimation()}</div>
                    <div
                        className={`chat-container ${
                            isMinimized ? "chat-container-minimized" : "chat-container-expanded"
                        }`}
                    >
                        <div className="chat-container-header">
                            <span>Roast Royale: Clash, Burn, Dominate!</span>
                            <div className="header-buttons">
                                <div className="utility-buttons">
                                    <button className="auto-speak" onClick={toggleAutoSpeak}>
                                        <FaPhoneAlt size={20} />
                                    </button>
                                    <button onClick={toggleMinimize}>
                                        <FaWindowMinimize size={20} />
                                    </button>
                                </div>
                                <select
                                    className="voice-select"
                                    value={selectedVoice?.name || ""}
                                    onChange={(e) =>
                                        setSelectedVoice(
                                            voices.find((voice) => voice.name === e.target.value)
                                        )
                                    }
                                >
                                    {voices.map((voice) => (
                                        <option key={voice.name} value={voice.name}>
                                            {voice.name} - {voice.lang}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {!isMinimized && (
                            <div className="chat-box" ref={chatBoxRef}>
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`chat-message ${
                                            msg.sender === "user" ? "user" : "bot"
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!isMinimized && (
                            <div className="input-box">
                                <input
                                    type="text"
                                    value={userMessage}
                                    onChange={(e) => setUserMessage(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Type your message here..."
                                />
                                <button onClick={() => handleUserMessage(userMessage)}>
                                    <FaPaperPlane size={20} />
                                </button>
                                {!autoSpeakEnabled && (
                                    <button onClick={startListening} disabled={isListening}>
                                        <FaMicrophone size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
