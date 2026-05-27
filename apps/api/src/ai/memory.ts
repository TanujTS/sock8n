
type TextPart = { text: string }
type FunctionCallPart = { functionCall: {name: string; args: Record<string, unknown> } };
type FunctionResponsePart = { functionResponse: { name: string; response: Record<string, unknown>} };
type Part = TextPart | FunctionCallPart | FunctionResponsePart
interface HistoryEntry {
    role: "user" | "model";
    parts: Part[];
}

export class ChatMemory {
  private history: HistoryEntry[] = [];

  addUserMessage(text: string) {
    this.history.push({ role: "user", parts: [{ text }] });
  }

  addModelMessage(text: string) {
    this.history.push({ role: "model", parts: [{ text }] });
  }

  // called after a tool executes
  addFunctionResponse(name: string, response: Record<string, unknown>) {
    this.history.push({
      role: "user",
      parts: [{ functionResponse: { name, response } }],
    });
  }

  // called when gemini invokes a tool 
  addFunctionCall(name: string, args: Record<string, unknown>) {
    this.history.push({
      role: "model",
      parts: [{ functionCall: { name, args } }],
    });
  }

  getHistory() {
    return this.history;
  }
}
