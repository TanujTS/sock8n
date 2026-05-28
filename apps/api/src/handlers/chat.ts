import WebSocket from "ws";
import { ai, MODEL_NAME } from "../ai/client";
import { allTools } from "../tools/index";
import { executeN8nWebhook } from "../services/n8n";
import { ChatMemory } from "../ai/memory";
import { sendWsMessage } from "../utils/response";

const MAX_TOOL_ITERATIONS = 5; // safety: prevent infinite loops
type HilCallback = (call: { callId: string; name: string; args: Record<string, unknown> }) => Promise<boolean>;

export async function handleChatMessage(
  ws: WebSocket,
  message: string,
  memory: ChatMemory,
  requestApproval: HilCallback
) {
  try {
    memory.addUserMessage(message);
    console.log(JSON.stringify(memory.getHistory()))
    await runAgentLoop(ws, memory, requestApproval);
  } catch (err) {
    console.error(err);
    sendWsMessage(ws, "error", "Something went wrong processing your message.");
  }
}

// agent loop: call Gemini → if tool → execute → call Gemini again
async function runAgentLoop(ws: WebSocket, memory: ChatMemory, requestApproval: HilCallback) {
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

          // ===== HIL CHECKPOINT =====

          const callId = crypto.randomUUID();
          sendWsMessage(ws, "system", `Gemini wants to call "${call.name}"...`);

          const approved = await requestApproval({ callId, name: call.name, args });

          if (!approved) {
            // User cancelled — tell Gemini it didn't happen
            memory.addFunctionResponse(call.name, {
              cancelled: true,
              reason: "User declined the action.",
            });
            sendWsMessage(ws, "system", `Action "${call.name}" was cancelled.`);
            continue;
          }

          try {
            sendWsMessage(ws, "system", `Executing "${call.name}"...`);
            const result = await executeN8nWebhook(call.name, args);

            // Store result in the correct functionResponse format
            memory.addFunctionResponse(call.name, result as Record<string, unknown>);
            sendWsMessage(ws, "system", `"${call.name}" succeeded.`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            memory.addFunctionResponse(call.name, { error: msg });
            sendWsMessage(ws, "error", `"${call.name}" failed: ${msg}`);
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