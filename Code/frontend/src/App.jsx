import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  // ===========================================================
  // STATE
  // ===========================================================
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

  // NEW: TTS toggle
  const [ttsMode, setTtsMode] = useState("summary"); // "summary" | "full"
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const introPlayedRef = useRef(false);

  const disease = "Type 2 Diabetes";

  // ===========================================================
  // SPEECH RECOGNITION
  // ===========================================================
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput((prev) => (prev ? prev + " " + text : text));
    };

    recognitionRef.current = rec;
  }, []);

  // ===========================================================
  // CLEANER FOR TTS (markdown → natural speech)
  // ===========================================================
  const cleanForTTS = (text) => {
    if (!text) return "";
    let cleaned = text;

    // Remove disclaimers (anything after ---)
    cleaned = cleaned.split("---")[0];

    // Remove markdown bold ** **
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

    // Replace bullets with natural commas
    cleaned = cleaned.replace(/^\s*\*\s*/gm, "");

    // Remove markdown quotes >
    cleaned = cleaned.replace(/^>\s*/gm, "");

    // Remove extra line breaks
    cleaned = cleaned.replace(/\n{2,}/g, ". ");
    cleaned = cleaned.replace(/\n/g, ". ");

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

    // Remove [brackets]
    cleaned = cleaned.replace(/\[(.*?)\]/g, "$1");

    cleaned = cleaned.trim();
    if (!cleaned.endsWith(".")) cleaned += ".";

    return cleaned;
  };

const stopSpeaking = () => {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }
  setIsSpeaking(false);
};

  // ===========================================================
  // AUTO-SUMMARY (short spoken version)
  // Extracts first key sentences & first 4–6 bullet points
  // ===========================================================
  const summarizeForTTS = (text) => {
    if (!text) return "";

    const main = text.split("---")[0];

    const lines = main.split("\n").map((l) => l.trim());

    const bulletPoints = lines.filter((l) => l.startsWith("*"));
    const sentences = main.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);

    let summary = "";

    if (bulletPoints.length > 0) {
      summary +=
        "Here are the key points: " +
        bulletPoints
          .slice(0, 5)
          .map((b) => b.replace("*", "").trim())
          .join(", ") +
        ". ";
    } else {
      summary += sentences.slice(0, 2).join(". ") + ". ";
    }

    return summary.trim();
  };

  // ===========================================================
  // TTS REQUEST (ElevenLabs)
  // ===========================================================
const requestTTS = async (text) => {
  try {
    // Stop any previous audio 
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const res = await fetch("http://127.0.0.1:8000/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    if (data.audio && audioRef.current) {
      const url = `data:audio/mp3;base64,${data.audio}`;
      audioRef.current.src = url;

      setIsSpeaking(true);

      audioRef.current.play()
        .then(() => {
          // When audio finishes, disable speaking state
          audioRef.current.onended = () => {
            setIsSpeaking(false);
          };
        })
        .catch(() => {
          setIsSpeaking(false);
        });
    }
  } catch (err) {
    console.error("TTS error:", err);
    setIsSpeaking(false);
  }
};


  // ===========================================================
  // AUTOPLAY UNLOCK (Chrome)
  // ===========================================================
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        const silent =
          "data:audio/mp3;base64,SUQzBAAAAAAAF1RTU0UAAAAPAAADTGF2ZjU2LjMyLjEwNAAAAAAAAAAAAAAA//tQxA...";
        audioRef.current.src = silent;
        audioRef.current.play().catch(() => {});
      }
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
  }, []);

  // ===========================================================
  // INTRO TTS (only after first user click)
  // ===========================================================
  useEffect(() => {
    const speakIntro = () => {
      if (!introPlayedRef.current) {
        requestTTS(messages[0].content);
        introPlayedRef.current = true;
      }
      window.removeEventListener("click", speakIntro);
    };

    window.addEventListener("click", speakIntro);
  }, [messages]);

  // ===========================================================
  // BACKEND CALL
  // ===========================================================
  const callBackend = async (msg) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, disease }),
      });

      if (!res.ok) {
        return {
          answer: "⚠️ Backend unreachable. Please try again.",
          sources: [],
          disclaimer: "",
        };
      }
      return await res.json();
    } catch {
      return {
        answer: "⚠️ Network error contacting backend.",
        sources: [],
        disclaimer: "",
      };
    }
  };

  // ===========================================================
  // SEND MESSAGE
  // ===========================================================
  const handleSend = async () => {
    stopSpeaking();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
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
          "⚠️ The information provided is for educational purposes only.",
        showSources: false,
        showDisclaimer: false,
      };

      setMessages((prev) => [...prev, botMsg]);

      // --- TTS MODE handling ---
      let speakText = "";
      if (ttsMode === "summary") {
        speakText = summarizeForTTS(backend.answer);
      } else {
        speakText = cleanForTTS(backend.answer);
      }
      requestTTS(speakText);
    } finally {
      setIsLoading(false);
    }
  };

  // ENTER → SEND
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // MIC CLICK
  const handleMicClick = () => {
    if (!speechSupported) {
      alert("Speech recognition unsupported on this device.");
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  // ===========================================================
  // UI
  // ===========================================================
  return (
    <div className="app">
      <div className="app-inner">
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

            {/* NEW — TTS MODE TOGGLE */}
            <button
              className="reset-btn"
              onClick={() =>
                setTtsMode((prev) =>
                  prev === "summary" ? "full" : "summary"
                )
              }
            >
              🔊 TTS: {ttsMode === "summary" ? "Summary" : "Full Answer"}
            </button>

            <button
              className="reset-btn"
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    content:
                      "Hi, I’m TrustMedAI. I can answer educational questions about Type 2 Diabetes. What would you like to know?",
                    sources: [],
                    disclaimer: "",
                  },
                ]);
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
                className={`message-row ${
                  msg.role === "user" ? "user" : "assistant"
                }`}
              >
                <div className="avatar">
                  {msg.role === "user" ? "🧑" : "🤖"}
                </div>

                <div className="message-bubble">
                  {/* MAIN TEXT */}
                  {msg.content.split("\n").map((line, i) => {
                    if (line.startsWith(">"))
                      return (
                        <p key={i} className="quote">
                          {line.slice(1)}
                        </p>
                      );

                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={i}>
                        {parts.map((p, j) =>
                          p.startsWith("**") && p.endsWith("**") ? (
                            <strong key={j}>{p.replace(/\*\*/g, "")}</strong>
                          ) : (
                            <span key={j}>{p}</span>
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
                        let speakText =
                          ttsMode === "summary"
                            ? summarizeForTTS(msg.content)
                            : cleanForTTS(msg.content);
                        requestTTS(speakText);
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
                        {msg.sources.map((s, i) => (
                          <li key={i}>
                            {s.source} — {s.section}
                            {s.subsection && ` / ${s.subsection}`}
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
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              className="send-btn"
              onClick={isSpeaking ? stopSpeaking : handleSend}
              disabled={isLoading || (!input.trim() && !isSpeaking)}
            >
              {isSpeaking ? "🛑 Stop" : isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="app-footer">
          ⚠️ TrustMedAI is for educational purposes only.
        </footer>
      </div>
    </div>
  );
}

export default App;
