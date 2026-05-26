import WebSocket from 'ws';
import { ai, MODEL_NAME } from '../ai/client';
import { allTools } from '../tools/index';
import { executeN8nWebhook } from '../services/n8n';
import { ChatMemory } from '../ai/memory';
import { sendWsMessage } from '../utils/response';

export async function handleChatMessage(ws: WebSocket, message: string, memory: ChatMemory) {
    try {
        console.log(`Received user input: ${message}`);
        console.log(`history: ${memory.getHistory().toString()}`)
        memory.addMessage("user", message);

        const chatHistory = memory.getHistory();
        
        const responseStream = await ai.models.generateContentStream({
            model: MODEL_NAME,
            contents: chatHistory,
            config: { tools: allTools }
        })

        let completeResponse = "";

        for await (const chunk of responseStream) {
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                for (const call of chunk.functionCalls) {
                    if (!call.name) continue;
                    
                    const args = call.args as Record<string, any>;
                    sendWsMessage(ws, "system", `Executing tool: "${call.name}"...`);
                    
                    try {
                        const result = await executeN8nWebhook(call.name, args);
                        memory.addMessage("user", `System: The tool ${call.name} executed successfully. Result: ${JSON.stringify(result)}`);
                        sendWsMessage(ws, "system", `n8n response: ${(result as any).message || 'Task successfully sent to n8n'}`);
                    } catch (err: any) {
                        console.error("n8n webhook failed: ", err);
                        memory.addMessage("user", `System: The tool ${call.name} failed with error: ${err.message}`);
                        sendWsMessage(ws, "error", `Failed to communicate with n8n for ${call.name}.`);
                    }
                }
            } 
            else if (chunk.text) {
                completeResponse += chunk.text;
                sendWsMessage(ws, "ai_chunk", chunk.text);
            }
        }

        if (completeResponse) {
            memory.addMessage("model", completeResponse)
        }
        
    } catch (err) {
        console.error(err);
        sendWsMessage(ws, "error", "Something went wrong processing your message.");
    }
}
