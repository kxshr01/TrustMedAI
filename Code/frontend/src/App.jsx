import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?",
      sources: [],
      disclaimer: "",
      showSources: false,
      showDisclaimer: false,
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const disease = "Type 2 Diabetes";

  // -------------------------------------------------------------------
  // SPEECH RECOGNITION SETUP
  // -------------------------------------------------------------------
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognitionRef.current = recognition;
  }, []);

  // -------------------------------------------------------------------
  // TTS FUNCTION (FIXED VERSION — uses data URL, works reliably)
  // -------------------------------------------------------------------
  const requestTTS = async (text) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (data.audio) {
        // Build data URL directly — safest method
        const audioURL = `data:audio/mp3;base64,${data.audio}`;

        if (audioRef.current) {
          audioRef.current.src = audioURL;
          await audioRef.current.play().catch(() => {
            console.warn("Autoplay blocked, waiting for user interaction");
          });
        }
      }
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  // -------------------------------------------------------------------
  // UNLOCK AUTOPLAY AFTER FIRST USER INTERACTION
  // (Chrome requires this!)
  // -------------------------------------------------------------------
  const unlockAutoplay = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // -------------------------------------------------------------------
  // INTRO GREETING VOICE ON PAGE LOAD
  // -------------------------------------------------------------------
  useEffect(() => {
    const intro = messages[0].content;
    requestTTS(intro);
  }, []);

  // -------------------------------------------------------------------
  // CALL BACKEND
  // -------------------------------------------------------------------
  const callBackend = async (userMessage) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, disease }),
      });

      if (!res.ok) {
        return {
          answer:
            "⚠️ Sorry, I couldn't reach the backend. Please try again.",
          sources: [],
          disclaimer: "",
        };
      }

      return await res.json();
    } catch (err) {
      console.error("network error", err);
      return {
        answer: "⚠️ Network error occurred while contacting backend.",
        sources: [],
        disclaimer: "",
      };
    }
  };

  // -------------------------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------------------------
  const handleSend = async () => {
    unlockAutoplay(); // <-- unlock audio playback for Chrome

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const backend = await callBackend(trimmed);

      const botMsg = {
        role: "assistant",
        content: backend.answer,
        sources: backend.sources || [],
        disclaimer:
          backend.disclaimer ||
          "⚠️ The information provided is for education only.",
        showSources: false,
        showDisclaimer: false,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak only the non-disclaimer part
      const mainAnswer = backend.answer.split("---")[0].trim();
      requestTTS(mainAnswer);
    } catch (err) {
      console.error("Chat backend error:", err);

      const errorMsg = {
        role: "assistant",
        content:
          "⚠️ Sorry, I encountered a backend error while generating the answer.",
        sources: [],
        disclaimer: "",
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // ENTER KEY TO SEND
  // -------------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -------------------------------------------------------------------
  // MICROPHONE CLICK
  // -------------------------------------------------------------------
  const handleMicClick = () => {
    if (!speechSupported) {
      alert("Speech recognition not supported here. Try Chrome desktop.");
      return;
    }

    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  // -------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------
  return (
    <div className="app">
      <div className="app-inner">
        {/* hidden audio player */}
        <audio ref={audioRef} hidden />

        {/* HEADER */}
        <header className="app-header">
          <div className="app-title-row">
            <span className="logo">🩺</span>
            <div>
              <h1>TrustMedAI – Type 2 Diabetes Chat</h1>
              <p>Ask educational questions about Type 2 Diabetes.</p>
            </div>
          </div>

          <div className="pill-reset-bar">
            <span className="pill">Type 2 Diabetes</span>
            <button
              className="reset-btn"
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    content:
                      "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?",
                  },
                ]);
                setInput("");
                requestTTS(
                  "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?"
                );
              }}
            >
              Reset
            </button>
          </div>
        </header>

        {/* CHAT */}
        <main className="chat-container">
          <div className="chat-window">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === "user"
                    ? "message-row user"
                    : "message-row assistant"
                }
              >
                <div className="avatar">
                  {msg.role === "user" ? "🧑" : "🤖"}
                </div>

                <div className="message-bubble">
                  {/* MAIN TEXT */}
                  {msg.content.split("\n").map((line, i) => {
                    if (line.startsWith(">")) {
                      return (
                        <p key={i} className="quote">
                          {line.slice(1).trim()}
                        </p>
                      );
                    }

                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={i}>
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j}>{part.replace(/\*\*/g, "")}</strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    );
                  })}

                  {/* LISTEN AGAIN */}
                  {msg.role === "assistant" && (
                    <button
                      className="listen-btn"
                      onClick={() => {
                        const clean = msg.content.split("---")[0].trim();
                        requestTTS(clean);
                      }}
                    >
                      🔊 Listen
                    </button>
                  )}

                  {/* EXPAND BUTTONS */}
                  {msg.role === "assistant" && (
                    <div className="expand-buttons">
                      <button
                        className="expand-btn"
                        onClick={() => {
                          const copy = [...messages];
                          copy[idx].showSources = !copy[idx].showSources;
                          setMessages(copy);
                        }}
                      >
                        {msg.showSources ? "Hide Sources" : "View Sources"}
                      </button>

                      <button
                        className="expand-btn"
                        onClick={() => {
                          const copy = [...messages];
                          copy[idx].showDisclaimer =
                            !copy[idx].showDisclaimer;
                          setMessages(copy);
                        }}
                      >
                        {msg.showDisclaimer ? "Hide Disclaimer" : "Disclaimer"}
                      </button>
                    </div>
                  )}

                  {/* COLLAPSIBLE SOURCES */}
                  {msg.showSources && msg.sources && (
                    <div className="collapsible-box">
                      <h4>Sources Used:</h4>
                      <ul>
                        {msg.sources.map((src, i) => (
                          <li key={i}>
                            {src.source} — {src.section}
                            {src.subsection && ` / ${src.subsection}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* COLLAPSIBLE DISCLAIMER */}
                  {msg.showDisclaimer && msg.disclaimer && (
                    <div className="collapsible-box">
                      <p>{msg.disclaimer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* TYPING INDICATOR */}
            {isLoading && (
              <div className="message-row assistant">
                <div className="avatar">🤖</div>
                <div className="message-bubble typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div className="input-area">
            <button
              className={`mic-btn ${isListening ? "listening" : ""}`}
              onClick={handleMicClick}
            >
              {isListening ? "🎙️ Listening..." : "🎤 Speak"}
            </button>

            <textarea
              className="chat-input"
              placeholder="Ask a question about Type 2 Diabetes..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </main>

        <footer className="app-footer">
          ⚠️ TrustMedAI is for educational purposes only. Always consult a
          healthcare professional.
        </footer>
      </div>
    </div>
  );
}

export default App;
