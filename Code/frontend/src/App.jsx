import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const disease = "Type 2 Diabetes"; // fixed disease

  // Speech recognition setup
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
        .map((result) => result[0].transcript)
        .join(" ");
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognitionRef.current = recognition;
  }, []);

  // ======================================================
  // ✅ UPDATED: Real backend call
  // ======================================================
  const callBackend = async (userMessage) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          disease: disease,
        }),
      });

      if (!res.ok) {
        console.error("Backend returned error:", res.status);
        return "⚠️ Sorry, I couldn't reach the backend. Please try again.";
      }

      const data = await res.json();
      return data.answer; // Use model’s answer
    } catch (error) {
      console.error("Network error:", error);
      return "⚠️ A network error occurred while contacting the backend.";
    }
  };

  // ======================================================
  // Sending messages
  // ======================================================
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Add user message immediately
    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // ---- CALL BACKEND ----
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          disease: "Type 2 Diabetes"
        }),
      });

      if (!res.ok) {
        throw new Error("Backend error");
      }

      const data = await res.json();

      // ---- ASSISTANT MESSAGE FORMAT ----
      const botMsg = {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
        disclaimer: data.disclaimer || "⚠️ The information provided is for general educational purposes only and is not a substitute for medical advice.",
        showSources: false,
        showDisclaimer: false,
      };

      // Add assistant message
      setMessages((prev) => [...prev, botMsg]);

    } catch (err) {
      console.error("Chat backend error:", err);

      const errorMsg = {
        role: "assistant",
        content:
          "⚠️ Sorry, I encountered an error retrieving the answer. Please try again.",
        sources: [],
        disclaimer: "",
        showSources: false,
        showDisclaimer: false
      };

      setMessages((prev) => [...prev, errorMsg]);

    } finally {
      setIsLoading(false);
    }
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Microphone button
  const handleMicClick = () => {
    if (!speechSupported) {
      alert(
        "Speech recognition is not supported in this browser. Try using Google Chrome on desktop."
      );
      return;
    }
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // ======================================================
  // UI
  // ======================================================
    return (
    <div className="app">
      <div className="app-inner">
        
        {/* HEADER */}
        <header className="app-header">
          <div className="app-title-row">
            <span className="logo">🩺</span>
            <div>
              <h1>TrustMedAI – Type 2 Diabetes Chat</h1>
              <p>Ask educational questions about Type 2 Diabetes. Not a substitute for a doctor.</p>
            </div>
          </div>

          <div className="pill-reset-bar">
            <span className="pill">Type 2 Diabetes</span>

            <button
              className="reset-btn"
              type="button"
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    content:
                      "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?",
                  },
                ]);
                setInput("");
              }}
            >
              Reset
            </button>
          </div>
        </header>

        {/* CHAT + INPUT */}
        <main className="chat-container">
          <div className="chat-window">

            {/* MESSAGES */}
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
                  
                  {/* MAIN MESSAGE TEXT */}
                  {msg.content.split("\n").map((line, i) => {
                    // blockquote handling
                    if (line.startsWith(">")) {
                      return (
                        <p key={i} className="quote">
                          {line.slice(1).trim()}
                        </p>
                      );
                    }

                    // simple **bold** handling
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={i}>
                        {parts.map((part, j) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return (
                              <strong key={j}>
                                {part.replace(/\*\*/g, "")}
                              </strong>
                            );
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </p>
                    );
                  })}

                  {/* ASSISTANT → SHOW BUTTONS */}
                  {msg.role === "assistant" && msg.sources && (
                    <div className="expand-buttons">
                      <button
                        className="expand-btn"
                        onClick={() => {
                          const newMsgs = [...messages];
                          newMsgs[idx].showSources = !newMsgs[idx].showSources;
                          setMessages(newMsgs);
                        }}
                      >
                        {msg.showSources ? "Hide Sources" : "View Sources"}
                      </button>

                      <button
                        className="expand-btn"
                        onClick={() => {
                          const newMsgs = [...messages];
                          newMsgs[idx].showDisclaimer =
                            !newMsgs[idx].showDisclaimer;
                          setMessages(newMsgs);
                        }}
                      >
                        {msg.showDisclaimer
                          ? "Hide Disclaimer"
                          : "Disclaimer"}
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
              type="button"
            >
              {isListening ? "🎙️ Listening..." : "🎤 Speak"}
            </button>

            <textarea
              className="chat-input"
              placeholder="Ask a question about Type 2 Diabetes..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
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

        {/* FOOTER */}
        <footer className="app-footer">
          ⚠️ TrustMedAI is for educational purposes only and does not provide
          medical diagnoses or treatment decisions. Always consult a healthcare
          professional.
        </footer>
      </div>
    </div>
  );

}

export default App;
