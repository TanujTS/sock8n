import WebSocket from 'ws';
import { ai, MODEL_NAME } from '../ai/client';
import { allTools } from '../tools/index';
import { executeN8nWebhook } from '../services/n8n';
import { ChatMemory } from '../ai/memory';
import { sendWsMessage } from '../utils/response';

export async function handleChatMessage(ws: WebSocket, message: string, memory: ChatMemory) {
    try {
        console.log(`Received user input: ${message}`);
        memory.addMessage("user", message);

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: message,
            config: { tools: allTools }
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            for (const call of response.functionCalls) {
                if (!call.name) continue;
                
                const args = call.args as Record<string, any>;
                sendWsMessage(ws, "system", `Executing tool: Logging "${args.task_name || call.name}"...`);
                
                try {
                    // Execute the tool using our generic webhook function
                    const result = await executeN8nWebhook(call.name, args);
                    
                    // Update memory so the AI knows the task succeeded!
                    memory.addMessage("user", `System: The tool ${call.name} executed successfully. Result: ${JSON.stringify(result)}`);
                    
                    sendWsMessage(ws, "system", `n8n response: ${result.message || 'Task successfully sent to n8n'}`);
                } catch (err: any) {
                    console.error("n8n webhook failed: ", err);
                    
                    // Tell AI it failed
                    memory.addMessage("user", `System: The tool ${call.name} failed with error: ${err.message}`);
                    sendWsMessage(ws, "error", `Failed to communicate with n8n for ${call.name}.`);
                }
            }
        } else if (response.text) {
            memory.addMessage("model", response.text);
            sendWsMessage(ws, "ai", response.text);
        }

    } catch (err) {
        console.error(err);
        sendWsMessage(ws, "error", "Something went wrong processing your message.");
    }
}
