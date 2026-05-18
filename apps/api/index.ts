import { GoogleGenAI, Type } from '@google/genai'
import 'dotenv/config'
import WebSocket, { WebSocketServer } from 'ws';


//refactor to proper env handling later
if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini Api Key missing!")
}

if (!process.env.N8N_WEBHOOK_URL) {
  throw new Error("N8N_WEBHOOK_URL missing in .env");
}

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const wss = new WebSocketServer({port: 8080})
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL

const logTaskDeclaration = {
  name: "log_task",
  description: "Logs a task to Google Sheets. Call this when the user asks to add, save, or remember a task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_name: { 
        type: Type.STRING,
        description: "Name of the task executed"
    },
      timestamp: {
         type: Type.STRING,
         description: "Current date in YYYY-MM-DD format"
        }
    },
    required: ["task_name", "timestamp"]
  }
};

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected via websocket!');
    ws.send(JSON.stringify({type: "system", message: "Connected to sock8n!"}))

    ws.on("message", async (message: Buffer) => {
        try {
            const userText = message.toString();
            console.log(`Received user input: ${userText}`)

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userText,
                config: {
                    tools: [{
                        functionDeclarations: [logTaskDeclaration]
                    }]
                }
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const call of response.functionCalls) {
                    if (call.name && call.name === "log_task") {
                        const args = call.args as Record<string, any>

                        ws.send(JSON.stringify({type: "system", message: `Executing tool: Logging "${args.task_name}"...`}))

                        try {
                            console.log(JSON.stringify(args));
                            const n8nRes = await fetch(N8N_WEBHOOK_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(args)
                            });

                            const result = await n8nRes.json();

                            ws.send(JSON.stringify({
                                type: "system", 
                                message: `n8n response: ${result.message || 'Task successfully sent to n8n'}`
                            }));
                        } catch (webhookError) {
                            console.error("n8n webhook failed: ", webhookError)
                            ws.send(JSON.stringify({type: "error", message: "Failed to communicate with n8n."}));
                        }   
                    }
                }
            } else if (response.text) {
                ws.send(JSON.stringify({type: "ai", message: response.text}))
            }
        } catch (err) {
            console.error(err);
            ws.send(JSON.stringify({ type: "error", message: "Something went wrong processing your message." }));
        }
    })
})


console.log("WebSocket server running on ws://localhost:8080");