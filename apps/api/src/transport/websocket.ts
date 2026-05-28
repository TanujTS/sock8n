import WebSocket, { WebSocketServer } from 'ws';
import { handleChatMessage } from '../handlers/chat';
import { ChatMemory } from '../ai/memory';
import { sendWsMessage } from '../utils/response';

export interface PendingToolCall {
    callId: string;
    name: string;
    args: Record<string, unknown>;
    resolve: (approved: boolean) => void;
}

export function initializeWebSocketServer(port: number) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Client connected via websocket!');
        const sessionMemory = new ChatMemory();

        //store pending HIL approval (one for now)
        let pendingCall: PendingToolCall | null = null;

        if (ws.readyState === WebSocket.OPEN) {
            sendWsMessage(ws, "system", "Connected to sock8n!");
        }

        ws.on("message", async (data: Buffer) => {
            const raw = data.toString();
            let parsed: { 
                type?: string
                callId?: string;
                approved?: boolean;
                text?: string;
            }
            try {
                parsed = JSON.parse(raw);
            } catch {
                // plain text
                parsed = { type: "chat", text: raw };
            }

            // handle hil approval response
            if (parsed.type === "tool_approval" && pendingCall) {
                if (parsed.callId === pendingCall.callId) {
                    pendingCall.resolve(parsed.approved ?? false);
                    pendingCall = null;
                }
                return;
            }

            const text = parsed.text ?? raw;
            await handleChatMessage(ws, text, sessionMemory, (call) => {
                return new Promise((resolve) => {
                    pendingCall = { ...call, resolve };

                    sendWsMessage(ws, "pending_approval", 
                        `About to call ${call.name} with ${JSON.stringify(call.args)}`,
                        { 
                            callId: call.callId, name: call.name, args: call.args
                        }
                    )
                })
            })
        });

        ws.on("close", () => console.log('Client disconnected'));
    });

    console.log(`WebSocket server running on ws://localhost:${port}`);
    return wss;
}
