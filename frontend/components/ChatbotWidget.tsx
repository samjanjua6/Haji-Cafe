"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";

import { auth } from "@/lib/auth";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(auth.isLoggedIn());
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi there! I am your AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const token = auth.getAccess();
    if (!token) return;

    // Use location.origin if running in browser to handle correct schema
    let base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    base = base.replace("http://", "ws://").replace("https://", "wss://");

    const wsUrl = `${base}/chatbot/ws?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress) {
          setProgressMsg(data.progress);
        }
        if (data.chunk) {
          setProgressMsg(null); // Clear progress indicator when real content starts
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
        }
      } catch (e) {
        console.error("Error parsing websocket message", e);
      }
    };

    websocket.onerror = () => {
      setIsLoading(false);
    };

    websocket.onclose = () => {
      setIsLoading(false);
    };

    ws.current = websocket;

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMsg: Message = { role: "user", content: input };
    const currentMsgs = [...messages, newMsg];

    setMessages(currentMsgs);
    setInput("");
    setIsLoading(true);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        messages: currentMsgs,
        client_time: new Date().toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }));
      setMessages((prev) => [...prev, { role: "model", content: "" }]);
    } else {
      setIsLoading(false);
      setMessages([
        ...currentMsgs,
        { role: "model", content: `**Error:** Connection closed or not established. Please try again.` }
      ]);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            color: "#0f172a",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "420px",
            height: "600px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={20} />
              <strong style={{ fontSize: "16px" }}>Assistant</strong>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: "var(--bg-base)",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor: msg.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                  color: msg.role === "user" ? "#0f172a" : "var(--text-primary)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  borderBottomRightRadius: msg.role === "user" ? "2px" : "12px",
                  borderBottomLeftRadius: msg.role === "model" ? "2px" : "12px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  border: msg.role === "model" ? "1px solid var(--border)" : "none",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                {msg.role === "model" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: 0 }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: "4px 0", paddingLeft: "20px" }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ margin: "2px 0" }} {...props} />,
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
              <div style={{ alignSelf: "flex-start", fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px", padding: "8px", backgroundColor: "var(--bg-surface)", borderRadius: "10px", border: "1px solid var(--border)", maxWidth: "85%" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent)", animation: "pulse 1.2s ease-in-out infinite" }} />
                {progressMsg || "Assistant is thinking..."}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "8px",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                outline: "none",
                fontSize: "14px",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                backgroundColor: input.trim() && !isLoading ? "var(--accent)" : "var(--bg-surface)",
                color: input.trim() && !isLoading ? "#0f172a" : "var(--text-muted)",
                border: input.trim() && !isLoading ? "none" : "1px solid var(--border)",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
