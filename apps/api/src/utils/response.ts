import WebSocket from 'ws';

export type ResponseType = "system" | "ai" | "error" | "ai_chunk" | "pending_approval";

export interface ApiResponse<T = any> {
    success: boolean;
    type: ResponseType;
    message: string;
    data?: T;
}

/**
 * Creates a standardized JSON string payload for websocket/http responses.
 */
export function createResponse<T>(
    type: ResponseType,
    message: string,
    data?: T,
    success?: boolean
): string {
    // Default to success=true unless the type is explicitly "error"
    const isSuccess = success !== undefined ? success : type !== "error";
    
    const res: ApiResponse<T> = {
        success: isSuccess,
        type,
        message,
        ...(data !== undefined && { data })
    };
    
    return JSON.stringify(res);
}

/**
 * Helper to immediately send a standardized response over a WebSocket.
 */
export function sendWsMessage<T>(
    ws: WebSocket, 
    type: ResponseType, 
    message: string, 
    data?: T,
    success?: boolean
) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(createResponse(type, message, data, success));
    }
}
