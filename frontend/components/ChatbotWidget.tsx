"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Mic, MicOff, Volume2, VolumeX, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { auth } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLayoutStore } from "@/lib/store";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent, TranscriptionSegment } from "livekit-client";
import "@livekit/components-styles";

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

// --- LiveKit UI Component ---
function LiveModeUI({ onEndLive }: { onEndLive: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();

  let statusText = "Connecting...";
  if (state === "speaking") statusText = "Assistant is speaking...";
  else if (state === "listening") statusText = "Listening...";
  else if (state === "thinking") statusText = "Assistant is thinking...";

  return (
    <div style={{
      padding: "12px", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: "12px",
      backgroundColor: "var(--bg-card)",
    }}>
      {/* End Session Button */}
      <button
        onClick={onEndLive}
        title="End Live Session"
        style={{
          ...btnBase,
          backgroundColor: "#ef4444",
          color: "#fff",
          animation: state === "listening" ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        <MicOff size={16} />
      </button>

      {/* Status & Visualizer */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderRadius: "20px",
        backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)"
      }}>
        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
          {statusText}
        </span>
        
        <div style={{ height: "20px", width: "60px", display: "flex", alignItems: "center" }}>
          <BarVisualizer
            state={state}
            barCount={5}
            trackRef={audioTrack}
            style={{ width: "100%", height: "100%" }}
            options={{ minHeight: 3 }}
          />
        </div>
      </div>
    </div>
  );
}

// Sub-component to sync LiveKit Transcriptions to the parent chat state
function LiveChatSync({ setLiveMessages }: { setLiveMessages: (msgs: Message[]) => void }) {
  const room = useRoomContext();
  const [transcripts, setTranscripts] = useState<Record<string, { role: "user" | "model", text: string, timestamp: number }>>({});

  useEffect(() => {
    if (!room) return;
    const onTranscription = (segments: TranscriptionSegment[], participant?: any) => {
      setTranscripts(prev => {
        const next = { ...prev };
        let changed = false;
        segments.forEach(seg => {
          const role = participant?.isLocal ? "user" : "model";
          if (seg.text.trim()) {
            const existing = prev[seg.id];
            const ts = existing ? existing.timestamp : Date.now();
            next[seg.id] = { role, text: seg.text, timestamp: ts };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };
    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
    };
  }, [room]);

  useEffect(() => {
    const sorted = Object.values(transcripts).sort((a, b) => a.timestamp - b.timestamp);
    const msgs: Message[] = sorted.map(s => ({ role: s.role, content: s.text }));
    setLiveMessages(msgs);
  }, [transcripts, setLiveMessages]);

  return null;
}

// --- Main Chatbot Widget ---
export default function ChatbotWidget() {
  const isChatbotOpen = useLayoutStore((s) => s.isChatbotOpen);
  const setChatbotOpen = useLayoutStore((s) => s.setChatbotOpen);
  const isOpen = isChatbotOpen;
  const setIsOpen = setChatbotOpen;
  const { data: user } = useCurrentUser();
  const isLoggedIn = !!user;

  // Standard Mode State
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi there! I am your AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [livekitToken, setLivekitToken] = useState("");
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);

  // Voice state (Standard Mode)
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

  // Fetch LiveKit token when Live Mode is activated
  useEffect(() => {
    if (isLiveMode && !livekitToken) {
      const accessToken = auth.getAccess();
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      fetch(`${base}/chatbot/livekit-token`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) setLivekitToken(data.token);
        })
        .catch(console.error);
    }
  }, [isLiveMode, livekitToken]);

  // --- WebSocket Setup (Standard Mode) ---
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
              const updatedMsg = { ...lastMsg, content: lastMsg.content + data.chunk };
              newMessages[newMessages.length - 1] = updatedMsg;
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
          if (ttsEnabledRef.current && currentResponseRef.current.trim() && !isLiveMode) {
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
  }, [isOpen, isLiveMode]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLiveMode]);

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

  const activateLiveMode = () => {
    stopTTS();
    if (isRecording) stopRecording();
    setLivekitToken(""); // Always reset token so a fresh room is created
    setIsLiveMode(true);
  };

  const deactivateLiveMode = () => {
    setIsLiveMode(false);
    setLivekitToken(""); // Clear token so next session gets a fresh one
    // Optionally append live messages to the permanent transcript when ending
    if (liveMessages.length > 0) {
      setMessages((prev) => [...prev, ...liveMessages]);
      setLiveMessages([]);
    }
  };

  // Auto-close chatbot on logout to ensure state is clean for next user
  useEffect(() => {
    if (!isLoggedIn && isOpen) {
      setIsOpen(false);
      setIsLiveMode(false);
    }
  }, [isLoggedIn, isOpen]);

  if (!isLoggedIn) return null;

  const micActive = isRecording || isTranscribing;

  return (
    <>
      {/* Chat Window */}
      <div style={{
        width: isOpen ? "400px" : "0px", 
        height: "100%",
        opacity: isOpen ? 1 : 0,
        backgroundColor: "var(--bg-card)",
        borderLeft: isOpen ? "1px solid var(--border)" : "none",
        display: "flex", flexDirection: "column",
        flexShrink: 0, overflow: "hidden", zIndex: 40,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-left 0.3s",
      }}>
          {/* Header */}
          <div style={{
            height: "var(--topbar-height, 60px)", padding: "0 16px",
            backgroundColor: "var(--bg-surface)", flexShrink: 0,
            color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            zIndex: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={20} />
              <strong style={{ fontSize: "16px" }}>Assistant</strong>
              {isSpeaking && !isLiveMode && (
                <span style={{ fontSize: "11px", color: "var(--accent)", fontStyle: "italic" }}>
                  🔊 Speaking...
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              
              {!isLiveMode && (
                <button
                  onClick={activateLiveMode}
                  title="Enter Gemini Live Mode"
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "16px",
                    backgroundColor: "var(--accent)", color: "#0f172a",
                    border: "none", cursor: "pointer", fontWeight: 600, fontSize: "12px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  <Activity size={14} /> Live
                </button>
              )}

              {!isLiveMode && (
                <button
                  onClick={() => { setTtsEnabled((v) => !v); if (!ttsEnabled === false) stopTTS(); }}
                  title={ttsEnabled ? "Disable auto-speak" : "Enable auto-speak"}
                  style={{ ...btnBase, backgroundColor: "transparent", color: ttsEnabled ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              )}

              <button
                onClick={() => { setIsOpen(false); deactivateLiveMode(); }}
                style={{ ...btnBase, backgroundColor: "transparent", color: "var(--text-muted)", marginLeft: "4px" }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area - Always Visible */}
          <div style={{
            flex: 1, padding: "16px", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "12px",
            backgroundColor: "var(--bg-base)",
          }}>
            {[...messages, ...liveMessages].map((msg, i) => (
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

          {/* Conditional Input Area vs Live Mode UI */}
          {isLiveMode ? (
            livekitToken ? (
              <LiveKitRoom
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                token={livekitToken}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={() => { setIsLiveMode(false); setLivekitToken(""); }}
                style={{ display: "contents" }}
                data-lk-theme="none"
              >
                <RoomAudioRenderer />
                <LiveChatSync setLiveMessages={setLiveMessages} />
                <LiveModeUI onEndLive={deactivateLiveMode} />
              </LiveKitRoom>
            ) : (
              <div style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-card)", color: "var(--text-muted)", fontSize: "13px" }}>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "var(--accent)", animation: "pulse 1.2s ease-in-out infinite", marginRight: "8px"
                }} />
                Preparing Live Session...
              </div>
            )
          ) : (
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
          )}
        </div>
    </>
  );
}
