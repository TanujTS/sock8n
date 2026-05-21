import { ENV } from '../config/env';

// shape of a single tool, add args later
export type N8nToolConfig = {
    webhookUrl: string;
};

// tools config; refactor later
export const TOOLS_CONFIG: Record<string, N8nToolConfig> = {
    log_task: {
        webhookUrl: ENV.N8N_WEBHOOK_URL,
    },
};

export async function executeN8nWebhook(toolName: string, args: Record<string, any>) {
    const tool = TOOLS_CONFIG[toolName];

    if (!tool) {
        throw new Error(`No n8n tool configuration found for: ${toolName}`);
    }

    const res = await fetch(tool.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    });

    if (!res.ok) {
        throw new Error(`n8n webhook failed with status ${res.status}`);
    }
    return await res.json();
}