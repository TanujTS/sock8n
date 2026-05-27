import WebSocket from "ws";
import { ai, MODEL_NAME } from "../ai/client";
import { allTools } from "../tools/index";
import { executeN8nWebhook } from "../services/n8n";
import { ChatMemory } from "../ai/memory";
import { sendWsMessage } from "../utils/response";

const MAX_TOOL_ITERATIONS = 5; // safety: prevent infinite loops

export async function handleChatMessage(
  ws: WebSocket,
  message: string,
  memory: ChatMemory
) {
  try {
    memory.addUserMessage(message);
    console.log(JSON.stringify(memory.getHistory()))
    await runAgentLoop(ws, memory);
  } catch (err) {
    console.error(err);
    sendWsMessage(ws, "error", "Something went wrong processing your message.");
  }
}

// agent loop: call Gemini → if tool → execute → call Gemini again
async function runAgentLoop(ws: WebSocket, memory: ChatMemory) {
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: memory.getHistory(),
      config: { tools: allTools },
    });

    let textAccumulator = "";
    let toolCallDetected = false;

    for await (const chunk of stream) {
      // Handle function calls
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        toolCallDetected = true;

        for (const call of chunk.functionCalls) {
          if (!call.name || !call.args) continue;

          const args = call.args as Record<string, unknown>;

          // Store the model's decision to call this tool
          memory.addFunctionCall(call.name, args);

          // -- INSERT HIL CHECKPOINT HERE LATER --
          sendWsMessage(ws, "system", `Executing: ${call.name}(${JSON.stringify(args)})`);

          try {
            const result = await executeN8nWebhook(call.name, args);

            // Store result in the correct format so Gemini can see it
            memory.addFunctionResponse(call.name, result as Record<string, unknown>);

            sendWsMessage(ws, "system", `Tool "${call.name}" succeeded.`);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            memory.addFunctionResponse(call.name, { error: message });
            sendWsMessage(ws, "error", `Tool "${call.name}" failed: ${message}`);
          }
        }

        // Tool was called — break inner loop and re-query Gemini
        break;
      }

      // Handle streaming text
      if (chunk.text) {
        textAccumulator += chunk.text;
        sendWsMessage(ws, "ai_chunk", chunk.text);
      }
    }

    // If we got text (not a tool call), we're done
    if (!toolCallDetected) {
      if (textAccumulator) {
        memory.addModelMessage(textAccumulator);
      }
      return;
    }
    // Otherwise: loop continues — call Gemini again with tool result in history
  }

  // Safety: max iterations hit
  sendWsMessage(ws, "error", "Agent loop exceeded maximum iterations.");
}