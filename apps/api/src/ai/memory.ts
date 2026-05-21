export class ChatMemory {
    private history: { role: string; parts: { text: string }[] }[] = [];

    addMessage(role: "user" | "model", text: string) {
        this.history.push({ role, parts: [{ text }] });
    }

    getHistory() {
        return this.history;
    }
}
