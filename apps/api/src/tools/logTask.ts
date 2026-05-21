import { Type } from "@google/genai";

export const logTaskDeclaration = {
    name: "log_task",
    description: "Logs a task to Google Sheets. Call this when the user asks to add, save, or remember a task.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            task_name: { type: Type.STRING, description: "Name of the task executed" },
            timestamp: { type: Type.STRING, description: "Current date in YYYY-MM-DD format" }
        },
        required: ["task_name", "timestamp"]
    }
};