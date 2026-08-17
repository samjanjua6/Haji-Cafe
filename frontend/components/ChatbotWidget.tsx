"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Message = {
  role: "user" | "model";
  content: string;
};

const btnBase: React.CSSProperties = {
  border: "none",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 0.2s, transform 0.15s",
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const isLoggedIn = !!user;

  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi there! I am your AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(ttsEnabled);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const currentResponseRef = useRef<string>("");
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // --- WebSocket Setup ---
  useEffect(() => {
    if (!isOpen) {
      ws.current?.close();
      ws.current = null;
      return;
    }

    const token = auth.getAccess();
    if (!token) return;

    let base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    base = base.replace("http://", "ws://").replace("https://", "wss://");
    const websocket = new WebSocket(`${base}/chatbot/ws?token=${token}`);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.progress) {
          setProgressMsg(data.progress);
        }

        if (data.chunk) {
          setProgressMsg(null);
          currentResponseRef.current += data.chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === "model" && lastMsg.content !== undefined) {
              lastMsg.content += data.chunk;
            } else {
              newMessages.push({ role: "model", content: data.chunk });
            }
            return newMessages;
          });
        }

        if (data.done) {
          setProgressMsg(null);
          setIsLoading(false);
          // Auto-play TTS for the full response only if enabled
          if (ttsEnabledRef.current && currentResponseRef.current.trim()) {
            playTTS(currentResponseRef.current);
          }
          currentResponseRef.current = "";
        }
      } catch (e) {
        console.error("Error parsing websocket message", e);
      }
    };

    websocket.onerror = () => setIsLoading(false);
    websocket.onclose = () => setIsLoading(false);
    ws.current = websocket;

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [isOpen]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Send Message ---
  const sendMessages = useCallback((msgs: Message[]) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    currentResponseRef.current = "";
    // Stop any currently playing TTS
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
      setIsSpeaking(false);
    }
    ws.current.send(JSON.stringify({
      messages: msgs,
      client_time: new Date().toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
    setMessages((prev) => [...prev, { role: "model", content: "" }]);
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const newMsg: Message = { role: "user", content: input };
    const currentMsgs = [...messages, newMsg];
    setMessages(currentMsgs);
    setInput("");
    setIsLoading(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      sendMessages(currentMsgs);
    } else {
      setIsLoading(false);
      setMessages([...currentMsgs, { role: "model", content: "**Error:** Connection closed. Please try again." }]);
    }
  };

  // --- TTS Playback ---
  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      const token = auth.getAccess();
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const resp = await fetch(`${base}/chatbot/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) { setIsSpeaking(false); return; }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        currentAudio.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudio.current = null;
      };
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopTTS = () => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
      setIsSpeaking(false);
    }
  };

  // --- Microphone Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        await transcribeAudio(blob);
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const token = auth.getAccess();
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const resp = await fetch(`${base}/chatbot/stt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) { setIsTranscribing(false); return; }
      const data = await resp.json();
      const transcript: string = data.transcript?.trim();

      if (transcript) {
        // Auto-send the transcript
        const newMsg: Message = { role: "user", content: transcript };
        const currentMsgs = [...messages, newMsg];
        setMessages(currentMsgs);
        setIsLoading(true);
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          sendMessages(currentMsgs);
        }
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      stopTTS(); // Stop any TTS before recording
      startRecording();
    }
  };

  // Auto-close chatbot on logout to ensure state is clean for next user
  useEffect(() => {
    if (!isLoggedIn && isOpen) setIsOpen(false);
  }, [isLoggedIn, isOpen]);

  if (!isLoggedIn) return null;

  const micActive = isRecording || isTranscribing;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed", bottom: "24px", right: "24px",
            width: "56px", height: "56px", borderRadius: "50%",
            backgroundColor: "var(--accent)", color: "#0f172a", border: "none",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "420px", height: "600px",
          backgroundColor: "var(--bg-card)", borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
          zIndex: 9999, overflow: "hidden", border: "1px solid var(--border)",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px", backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={20} />
              <strong style={{ fontSize: "16px" }}>Assistant</strong>
              {isSpeaking && (
                <span style={{ fontSize: "11px", color: "var(--accent)", fontStyle: "italic" }}>
                  🔊 Speaking...
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {/* TTS toggle */}
              <button
                onClick={() => { setTtsEnabled((v) => !v); if (!ttsEnabled === false) stopTTS(); }}
                title={ttsEnabled ? "Disable auto-speak" : "Enable auto-speak"}
                style={{ ...btnBase, backgroundColor: "transparent", color: ttsEnabled ? "var(--accent)" : "var(--text-muted)" }}
              >
                {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ ...btnBase, backgroundColor: "transparent", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1, padding: "16px", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "12px",
            backgroundColor: "var(--bg-base)",
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor: msg.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                  color: msg.role === "user" ? "#0f172a" : "var(--text-primary)",
                  padding: "10px 14px", borderRadius: "12px",
                  borderBottomRightRadius: msg.role === "user" ? "2px" : "12px",
                  borderBottomLeftRadius: msg.role === "model" ? "2px" : "12px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  border: msg.role === "model" ? "1px solid var(--border)" : "none",
                  fontSize: "14px", lineHeight: "1.5",
                }}
              >
                {msg.role === "model" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: "4px 0" }} {...props} />,
                      a: ({ node, ...props }) => <a style={{ color: "var(--accent)", textDecoration: "underline" }} target="_blank" {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: "4px 0", paddingLeft: "20px" }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ margin: "4px 0", paddingLeft: "20px" }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ margin: "2px 0" }} {...props} />,
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: "auto", width: "100%" }}>
                          <table style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0" }} {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => <th style={{ border: "1px solid var(--border)", padding: "6px 8px", backgroundColor: "var(--bg-default)", textAlign: "left", whiteSpace: "nowrap" }} {...props} />,
                      td: ({ node, ...props }) => <td style={{ border: "1px solid var(--border)", padding: "6px 8px", whiteSpace: "nowrap" }} {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{
                alignSelf: "flex-start", fontSize: "13px", color: "var(--text-muted)",
                fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px",
                padding: "8px", backgroundColor: "var(--bg-surface)", borderRadius: "10px",
                border: "1px solid var(--border)", maxWidth: "85%",
              }}>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "var(--accent)", animation: "pulse 1.2s ease-in-out infinite",
                }} />
                {progressMsg || "Assistant is thinking..."}
              </div>
            )}
            {isTranscribing && (
              <div style={{
                alignSelf: "flex-end", fontSize: "13px", color: "var(--accent)",
                fontStyle: "italic", padding: "4px 8px",
              }}>
                🎙️ Transcribing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px", borderTop: "1px solid var(--border)",
              display: "flex", gap: "8px", alignItems: "center",
              backgroundColor: "var(--bg-card)",
            }}
          >
            {/* Mic Button */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
              title={isRecording ? "Stop recording" : "Speak to assistant"}
              style={{
                ...btnBase,
                backgroundColor: micActive ? "#ef4444" : "var(--bg-surface)",
                color: micActive ? "#fff" : "var(--text-muted)",
                border: micActive ? "none" : "1px solid var(--border)",
                animation: isRecording ? "pulse 1s ease-in-out infinite" : "none",
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Recording... click mic to stop" : "Ask me anything..."}
              disabled={isLoading || isRecording}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "20px",
                border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)", outline: "none", fontSize: "14px",
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                ...btnBase,
                backgroundColor: input.trim() && !isLoading ? "var(--accent)" : "var(--bg-surface)",
                color: input.trim() && !isLoading ? "#0f172a" : "var(--text-muted)",
                border: input.trim() && !isLoading ? "none" : "1px solid var(--border)",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              }}
            >
              <Send size={16} style={{ marginLeft: "2px" }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
