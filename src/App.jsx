import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import idleImage from "./assets/idle-1.jpeg";
import listenImage from "./assets/listen-1.jpeg";
import thinkImage from "./assets/think-1.jpeg";
import roastImage from "./assets/roast-1.jpeg";
import "./App.css";

// Check if the browser supports Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
    const [messages, setMessages] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [botState, setBotState] = useState("idle");
    const [isMinimized, setIsMinimized] = useState(false);
    const [isListening, setIsListening] = useState(false); // Track if speech is being captured
    const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false); // Track if Auto Speak is on
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    const chatBoxRef = useRef(null); // Reference for the chat box
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Set continuous to false to stop listening after a sentence
    recognition.lang = "en-US"; // Set the language to English
    recognition.interimResults = false; // Don't show results while listening
    recognition.maxAlternatives = 1; // Limit the results to the best alternative

    // Get available voices
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            setSelectedVoice(availableVoices.find(voice => voice.lang === "en-US"));
        };

        loadVoices();

        // Reload voices on voice change
        speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Function to make the bot speak
    const speak = (text) => {
        if (!selectedVoice) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice; // Set the selected voice
        utterance.pitch = 1;
        utterance.rate = 1;
        speechSynthesis.speak(utterance);
    };

    // Handle user message submission (either from speech or text)
    const handleUserMessage = async (message) => {
        if (message.trim() === "") return;

        setMessages((prev) => [...prev, { sender: "user", content: message }]);
        setBotState("think");

        try {
            const response = await axios.post("http://localhost:3000/api/model", {
                user: message,
            });
            const botResponse = response.data.response;
            setMessages((prev) => [...prev, { sender: "bot", content: botResponse }]);
            setBotState("roast");

            // Make the bot speak the response
            speak(botResponse);
        } catch (error) {
            console.error("Error communicating with the model:", error);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", content: "Oops! Something went wrong." },
            ]);
        } finally {
            setBotState("idle");
            setUserMessage(""); // Clear the text box after the message is handled
        }
    };

    // Start listening to the user
    const startListening = () => {
        if (isListening) return; // If already listening, do nothing
        setIsListening(true);
        setBotState("listen");
        recognition.start(); // Start speech recognition
    };

    // Stop listening when speech is detected
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserMessage(transcript); // Set the message from speech
        handleUserMessage(transcript); // Handle the speech message
        setIsListening(false);
        setBotState("idle");
    };

    // Handle errors with speech recognition
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setBotState("idle");
    };

    // Handle when recognition ends
    recognition.onend = () => {
        setIsListening(false);
        setBotState("idle");

        // If autoSpeak is enabled, restart listening after a pause
        if (autoSpeakEnabled) {
            startListening();
        }
    };

    // Handle key press event (Enter key)
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleUserMessage(userMessage);
        }
    };

    // Toggle the minimize button
    const toggleMinimize = () => {
        setIsMinimized((prev) => !prev);
    };

    // Toggle the Auto Speak button
    const toggleAutoSpeak = () => {
        if(autoSpeakEnabled)
            window.location.reload();
        setAutoSpeakEnabled((prev) => !prev);
    };

    // Automatically start listening if Auto Speak is enabled
    useEffect(() => {
        if (autoSpeakEnabled) {
            startListening(); // Start listening when Auto Speak is enabled
        } else {
            recognition.stop(); // Stop recognition if Auto Speak is disabled
        }
    }, [autoSpeakEnabled]);

    // Scroll to the bottom after messages change
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]); // Runs whenever messages change

    // Render bot animation based on state
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
            <div className="content-container">
                <div className="bot-image-container">{renderBotAnimation()}</div>
                <div
                    className={`chat-container ${isMinimized ? "chat-container-minimized" : "chat-container-expanded"}`}
                >
                    <div className="chat-container-header" onClick={toggleMinimize}>
                        <span>Roast Royale: Clash, Burn, Dominate!</span>
                        <div>
                            <button className="minimize-btn">
                                {isMinimized ? "Expand" : "Minimize"}
                            </button>
                            <button className="auto-speak-btn" onClick={toggleAutoSpeak}>
                                {autoSpeakEnabled ? "Auto Speak: On" : "Turn On Auto Speak"}
                            </button>
                            {/* Dropdown for voice selection */}
                            <select
                                value={selectedVoice?.name || ""}
                                onChange={(e) => {
                                    const selected = voices.find((voice) => voice.name === e.target.value);
                                    setSelectedVoice(selected);
                                }}
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
                                    className={`chat-message ${msg.sender === "user" ? "user" : "bot"}`}
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
                            <button onClick={() => handleUserMessage(userMessage)}>Send</button>
                            {!autoSpeakEnabled && (
                                <button onClick={startListening} disabled={isListening}>
                                    {isListening ? "Listening..." : "Speak to AI"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
