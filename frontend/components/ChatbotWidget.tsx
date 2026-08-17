"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { auth } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
  useChat,
  useRoomContext,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

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

// Inner component that actually uses LiveKit hooks
function InnerChat({ onClose }: { onClose: () => void }) {
  const { chatMessages, send, isSending } = useChat();
  const { state } = useVoiceAssistant(); 
  const { isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();
  
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;
    await send(input);
    setInput("");
  };

  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px", backgroundColor: "var(--bg-surface)",
        color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bot size={20} />
          <strong style={{ fontSize: "16px" }}>Assistant</strong>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
            {state === "speaking" && "🔊 Speaking..."}
            {state === "listening" && "👂 Listening..."}
            {state === "thinking" && "🤔 Thinking..."}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* We can use LiveKit's TrackToggle to mute/unmute audio output, but RoomAudioRenderer handles it.
              For simplicity, we just provide a disconnect/close button. */}
          <button onClick={onClose} style={{ ...btnBase, backgroundColor: "transparent", color: "var(--text-muted)" }}>
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
        {chatMessages.map((msg: any, i: number) => {
          const isUser = msg.from?.identity !== "assistant"; // Assuming agent uses "assistant" or similar
          // LiveKit's useChat stores local user messages with our own identity
          
          return (
            <div
              key={msg.id || i}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor: isUser ? "var(--accent)" : "var(--bg-surface)",
                color: isUser ? "#0f172a" : "var(--text-primary)",
                padding: "10px 14px", borderRadius: "12px",
                borderBottomRightRadius: isUser ? "2px" : "12px",
                borderBottomLeftRadius: !isUser ? "2px" : "12px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                border: !isUser ? "1px solid var(--border)" : "none",
                fontSize: "14px", lineHeight: "1.5",
              }}
            >
              {!isUser ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => <p style={{ margin: "4px 0" }} {...props} />,
                    a: ({ node, ...props }) => <a style={{ color: "var(--accent)", textDecoration: "underline" }} target="_blank" {...props} />,
                    ul: ({ node, ...props }) => <ul style={{ margin: "4px 0", paddingLeft: "20px" }} {...props} />,
                    ol: ({ node, ...props }) => <ol style={{ margin: "4px 0", paddingLeft: "20px" }} {...props} />,
                    li: ({ node, ...props }) => <li style={{ margin: "2px 0" }} {...props} />,
                  }}
                >
                  {msg.message}
                </ReactMarkdown>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.message}</span>
              )}
            </div>
          );
        })}
        {isThinking && (
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
            Assistant is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "12px", borderTop: "1px solid var(--border)",
        display: "flex", gap: "8px", alignItems: "center",
        backgroundColor: "var(--bg-card)",
      }}>
        {/* LiveKit Mic Toggle */}
        <TrackToggle 
          source={Track.Source.Microphone} 
          style={{
            ...btnBase,
            backgroundColor: isMicrophoneEnabled ? "#ef4444" : "var(--bg-surface)",
            color: isMicrophoneEnabled ? "#fff" : "var(--text-muted)",
            border: isMicrophoneEnabled ? "none" : "1px solid var(--border)",
            animation: state === "listening" && isMicrophoneEnabled ? "pulse 1s ease-in-out infinite" : "none",
          }}
        >
          {isMicrophoneEnabled ? <MicOff size={16} /> : <Mic size={16} />}
        </TrackToggle>

        <form onSubmit={handleSend} style={{ flex: 1, display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMicrophoneEnabled ? "Mic is on! You can speak directly..." : "Ask me anything..."}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "20px",
              border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)", outline: "none", fontSize: "14px",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            style={{
              ...btnBase,
              backgroundColor: input.trim() && !isSending ? "var(--accent)" : "var(--bg-surface)",
              color: input.trim() && !isSending ? "#0f172a" : "var(--text-muted)",
              border: input.trim() && !isSending ? "none" : "1px solid var(--border)",
              cursor: input.trim() && !isSending ? "pointer" : "not-allowed",
            }}
          >
            <Send size={16} style={{ marginLeft: "2px" }} />
          </button>
        </form>
      </div>
    </div>
  );
}


export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState("");
  const { data: user } = useCurrentUser();
  const isLoggedIn = !!user;

  // Auto-close chatbot on logout to ensure state is clean for next user
  useEffect(() => {
    if (!isLoggedIn && isOpen) {
      setIsOpen(false);
      setToken("");
    }
  }, [isLoggedIn, isOpen]);

  useEffect(() => {
    if (isOpen && isLoggedIn && !token) {
      const accessToken = auth.getAccess();
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      fetch(`${base}/chatbot/livekit-token`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, isLoggedIn, token]);

  if (!isLoggedIn) return null;

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
          {token ? (
            <LiveKitRoom
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
              token={token}
              connect={true}
              audio={true} // Automatically subscribe to incoming audio
              video={false}
              style={{ display: "flex", height: "100%", width: "100%" }}
            >
              <RoomAudioRenderer />
              <InnerChat onClose={() => setIsOpen(false)} />
            </LiveKitRoom>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{
                display: "inline-block", width: "12px", height: "12px", borderRadius: "50%",
                backgroundColor: "var(--accent)", animation: "pulse 1.2s ease-in-out infinite", marginBottom: "16px"
              }} />
              <br />
              Connecting to secure voice room...
            </div>
          )}
        </div>
      )}
    </>
  );
}
