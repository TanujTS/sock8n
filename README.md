# sock8n

**sock8n** is a full-stack, real-time AI agent application designed to demonstrate the integration of persistent bidirectional communication, deterministic LLM tool calling, and workflow automation. 

Instead of a standard conversational AI, sock8n acts as an **Action-Backed Assistant**. It listens to user intents, converts natural language into structured data, and physically executes tasks (like logging entries to a Google Sheet) via a local n8n automation engine.

---

## 🚀 What It Does

1. **Real-Time Communication:** A Next.js client maintains a persistent WebSocket connection to a Node.js backend, eliminating HTTP polling overhead.
2. **Intent Recognition & Tool Calling:** User messages are routed to the Google Gemini API. If a user asks to perform a specific action (e.g., *"Remind me to review PRs on 2026-05-19"*), Gemini bypasses standard text generation and outputs a structured JSON function call (`log_task`).
3. **Automated Execution:** The backend intercepts this tool call and forwards the extracted parameters to a local n8n Webhook. n8n processes the payload and pushes the data to a Google Sheet.
4. **Live System Feedback:** As the backend triggers the workflow and awaits n8n's response, it streams live system status updates back down the WebSocket to the frontend UI.

---

## 🛠️ Tech Stack & Tools

This project is structured as a monorepo using **pnpm workspaces**.

* **Monorepo Manager:** `pnpm`
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Backend:** Node.js, `ws` (Raw WebSockets), TypeScript
* **AI Provider:** Google Gemini API (`@google/genai`) - Model: *gemini-2.5-flash*
* **Automation Engine:** n8n (Self-hosted via Docker)
* **Integration:** Google Sheets API (via n8n nodes)

---

## 🧠 Technical Implementation Depth

### 1. The WebSocket Protocol Layer
Unlike standard stateless HTTP REST architectures, sock8n relies on full-duplex TCP socket connections. 
* **State Management:** The Node.js server (`ws`) tracks active client connections and pushes asynchronous updates (e.g., n8n webhook completions) without waiting for a client request.
* **Message Framing:** JSON payloads are passed through the socket and typed dynamically on the frontend into four categories: `user`, `ai`, `system` (for backend execution updates), and `error`.

### 2. Deterministic AI Tool Calling
To give the LLM "hands," we utilize structured function declarations.
* **Schema Definition:** The backend passes a `log_task` object schema to Gemini alongside the user prompt. 
* **Execution Interception:** The server inspects `response.functionCalls`. If `length > 0`, it halts the standard conversational loop, extracts the `call.args` as a `Record<string, any>`, and routes it to the execution engine (n8n).

### 3. Orchestration & Separation of Concerns
The Node.js backend handles state and LLM routing, but **not** API integrations.
* By offloading third-party authentication (Google OAuth) and API request logic to **n8n**, the backend remains lightweight. 
* n8n acts as the visual orchestration layer, receiving simple POST requests from the backend and handling the complex data transformation and external API delivery.

---

## 📂 Project Structure

```text
sock8n/
├── apps/
│   ├── server/               # Node.js WebSocket & Gemini logic
│   └── web/                  # Next.js Chat Client
