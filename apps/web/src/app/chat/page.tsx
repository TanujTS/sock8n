"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, AlertTriangle, Terminal, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

type MessageType = "user" | "ai" | "system" | "error" | "pending_approval";

interface ChatMessage {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  data?: { callId: string; name: string; args: Record<string, unknown> };
}

const createMessageId = () => Date.now().toString() + Math.random().toString(36).substring(7);

const appendSystemMessage = (messages: ChatMessage[], text: string): ChatMessage[] => {
  const latestTranscriptIndex = Math.max(
    messages.findLastIndex((msg) => msg.type === "user"),
    messages.findLastIndex((msg) => msg.type === "ai"),
    messages.findLastIndex((msg) => msg.type === "error")
  );
  const existingLogIndex = messages.findLastIndex(
    (msg, index) => msg.type === "system" && index > latestTranscriptIndex
  );

  if (existingLogIndex === -1) {
    return [
      ...messages,
      {
        id: createMessageId(),
        type: "system",
        text,
        timestamp: new Date(),
      },
    ];
  }

  const existingLog = messages[existingLogIndex];
  const updatedLog: ChatMessage = {
    ...existingLog,
    text: [existingLog.text, text].filter(Boolean).join("\n"),
    timestamp: new Date(),
  };

  return [
    ...messages.slice(0, existingLogIndex),
    ...messages.slice(existingLogIndex + 1),
    updatedLog,
  ];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [resolvedApprovals, setResolvedApprovals] = useState<Record<string, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasPendingApproval = messages.some(
    (msg) => msg.type === "pending_approval" && msg.data?.callId && !resolvedApprovals[msg.data.callId]
  );

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket("ws://localhost:8080"); //replace w env value on prod
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];

          // Handle streaming chunks
          if (data.type === "ai_chunk") {
            if (lastMsg && lastMsg.type === "ai") {
              // Append to the existing AI message block
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + (data.message || "")
              };
              return updatedMessages;
            } else {
              // Create the initial AI message block for the first chunk
              return [...prev, {
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                type: "ai",
                text: data.message || "",
                timestamp: new Date(),
              }];
            }
          }

          if (data.type === "system") {
            return appendSystemMessage(prev, data.message || "");
          }

          // Handle standard full messages (user, system, error, pending_approval)
          return [...prev, {
            id: createMessageId(),
            type: data.type || "ai",
            text: data.message || "",
            timestamp: new Date(),
            data: data.data,
          }];
        });
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "error",
          text: "WebSocket Connection Closed",
          timestamp: new Date(),
        },
      ]);
    };

    ws.onerror = () => {
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "error",
          text: "WebSocket Connection Error",
          timestamp: new Date(),
        },
      ]);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendApproval = (callId: string, approved: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: "tool_approval",
      callId,
      approved,
    }));

    setResolvedApprovals((prev) => ({ ...prev, [callId]: true }));
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (hasPendingApproval) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          type: "system",
          text: "Please confirm or cancel the pending action before sending another message.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);

    wsRef.current.send(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-background font-geist overflow-hidden">
      {/* Sidebar - Chat History */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="font-grotesk font-bold text-lg text-foreground tracking-tight">sock8n</h1>
        </div>

        <div className="flex-1 p-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Chat History
          </h2>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start font-normal text-sm h-10 px-2 bg-muted/50">
                <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="truncate">Current Session</span>
              </Button>
              {/* Future sessions will go here */}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden min-h-0 min-w-0">
        {/* Header */}
        <header className="h-14 border-b flex items-center px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0">
          <h2 className="font-grotesk font-semibold text-foreground">Chat</h2>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="max-w-4xl mx-auto space-y-6 p-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-32 space-y-4">
                <Bot className="h-12 w-12 opacity-20" />
                <p>Start typing a request to the AI...</p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.type === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              }

              if (msg.type === "error") {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <Card className="bg-destructive/10 border-destructive/20 p-4 rounded-xl max-w-[80%]">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-destructive mb-1 font-grotesk">WebSocket Error</h4>
                          <p className="text-sm text-destructive/90">{msg.text}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              }

              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-start w-full">
                    <Card className="bg-card border p-4 rounded-xl w-full max-w-4xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase font-jb-mono">
                          Execution Log
                        </h4>
                      </div>
                      <div className="bg-background border rounded-md p-3 font-jb-mono text-sm text-foreground overflow-x-auto">
                        <div className="space-y-1">
                          {msg.text.split("\n").map((line, index) => (
                            <div key={`${msg.id}-${index}`} className="flex gap-2">
                              <span className="text-primary shrink-0">{'>'}</span>
                              <span className="whitespace-pre-wrap break-words">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              }

              if (msg.type === "pending_approval") {
                const callId = msg.data?.callId;
                const isResolved = Boolean(callId && resolvedApprovals[callId]);

                return (
                  <div key={msg.id} className="flex justify-start w-full">
                    <Card className="bg-amber-500/10 border-amber-500/20 p-4 rounded-xl w-full max-w-2xl shadow-sm">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-amber-500 mb-1 font-grotesk">
                            Confirm action
                          </h4>
                          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{msg.text}</p>
                          {msg.data?.args && (
                            <pre className="text-xs bg-muted/50 border border-amber-500/10 p-3 rounded-md mb-3 font-jb-mono overflow-x-auto text-foreground">
                              {JSON.stringify(msg.data.args, null, 2)}
                            </pre>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => callId && sendApproval(callId, true)}
                              disabled={!callId || isResolved}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              {isResolved ? "Decision sent" : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => callId && sendApproval(callId, false)}
                              disabled={!callId || isResolved}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              }

              // AI Message
              return (
                <div key={msg.id} className="flex justify-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border mt-1">
                    <Bot className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-background shrink-0 pb-8">
          <div className="max-w-4xl mx-auto relative group">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isConnected
                  ? "Connecting to server..."
                  : hasPendingApproval
                    ? "Confirm or cancel the pending action first..."
                    : "Type a command or request..."
              }
              disabled={!isConnected || hasPendingApproval}
              className="pr-12 h-14 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/30 rounded-xl text-base shadow-sm font-geist"
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || !isConnected || hasPendingApproval}
              onClick={handleSendMessage}
              className="absolute right-2 top-2 h-10 w-10 rounded-lg transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3 font-jb-mono">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}
