import { ENV } from './config/env';
import { initializeWebSocketServer } from './transport/websocket';
import { db } from './services/db';

async function bootstrap() {
    try {
        console.log("Starting server...");
        await db.connect(); // Stub for future connection
        initializeWebSocketServer(ENV.PORT);
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

bootstrap();