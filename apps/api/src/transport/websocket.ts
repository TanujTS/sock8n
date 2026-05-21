import WebSocket, { WebSocketServer } from 'ws';
import { handleChatMessage } from '../handlers/chat';
import { ChatMemory } from '../ai/memory';
import { sendWsMessage } from '../utils/response';

export function initializeWebSocketServer(port: number) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Client connected via websocket!');
        const sessionMemory = new ChatMemory();

        if (ws.readyState === WebSocket.OPEN) {
            sendWsMessage(ws, "system", "Connected to sock8n!");
        }

        ws.on("message", async (data: Buffer) => {
            const userText = data.toString();
            await handleChatMessage(ws, userText, sessionMemory);
        });

        ws.on("close", () => console.log('Client disconnected'));
    });

    console.log(`WebSocket server running on ws://localhost:${port}`);
    return wss;
}
