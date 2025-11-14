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

  // Set up browser speech recognition (Web Speech API)
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

  // TODO: replace this with your real backend later
  const callBackend = async (userMessage) => {
    // Example for later:
    /*
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        disease: disease,
      }),
    });
    const data = await res.json();
    return data.answer;
    */

    // Temporary dummy response
    return (
      `Thanks for your question about **${disease}**.\n\n` +
      `*(Dummy response for now)* You asked:\n> ${userMessage}\n\n` +
      `In the final system, I will use online discussion themes + trusted medical sources to answer.`
    );
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const answer = await callBackend(trimmed);
      const botMsg = { role: "assistant", content: answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        role: "assistant",
        content:
          "Sorry, something went wrong while generating a response. Please try again.",
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

  return (
    <div className="app">
      <div className="app-inner">
        <header className="app-header">
          <div className="app-title-row">
            <span className="logo">🩺</span>
            <div>
              <h1>TrustMedAI – Type 2 Diabetes Chat</h1>
              <p>Ask educational questions about Type 2 Diabetes. Not a substitute for a doctor.</p>
            </div>
          </div>

          {/* LEFT: pill | RIGHT: reset */}
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
                  {msg.content.split("\n").map((line, i) => {
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
                </div>
              </div>
            ))}

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
