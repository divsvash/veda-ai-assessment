// src/config/websocket.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { JobProgressUpdate, WSMessage } from '../types';

interface ClientInfo {
  ws: WebSocket;
  assignmentIds: Set<string>;
  lastPing: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const assignmentId = url.searchParams.get('assignmentId');

      const clientInfo: ClientInfo = {
        ws,
        assignmentIds: new Set(assignmentId ? [assignmentId] : []),
        lastPing: Date.now(),
      };

      this.clients.set(clientId, clientInfo);
      console.log(`🔌 WS Client connected: ${clientId}${assignmentId ? ` → assignment ${assignmentId}` : ''}`);

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe' && msg.assignmentId) {
            clientInfo.assignmentIds.add(msg.assignmentId);
            console.log(`📡 Client ${clientId} subscribed to assignment ${msg.assignmentId}`);
          } else if (msg.type === 'unsubscribe' && msg.assignmentId) {
            clientInfo.assignmentIds.delete(msg.assignmentId);
          } else if (msg.type === 'ping') {
            clientInfo.lastPing = Date.now();
            this.send(ws, { type: 'ping', data: { message: 'pong' } });
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 WS Client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`WS Client ${clientId} error:`, err.message);
        this.clients.delete(clientId);
      });

      // Send initial connection confirmation
      this.send(ws, { type: 'ping', data: { message: 'connected' } });
    });

    // Heartbeat every 30s
    setInterval(() => this.heartbeat(), 30_000);

    console.log('✅ WebSocket server initialized on /ws');
  }

  broadcastJobProgress(update: JobProgressUpdate): void {
    const message: WSMessage = {
      type: update.status === 'completed' ? 'completed' : update.status === 'failed' ? 'error' : 'progress',
      data: update,
    };

    let sent = 0;
    for (const [, client] of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.assignmentIds.has(update.assignmentId) || client.assignmentIds.size === 0)
      ) {
        this.send(client.ws, message);
        sent++;
      }
    }

    if (sent > 0) {
      console.log(`📢 Broadcast to ${sent} clients: ${update.status} (${update.progress}%)`);
    }
  }

  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private heartbeat(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.send(client.ws, { type: 'ping', data: { message: 'heartbeat' } });
      } else {
        this.clients.delete(clientId);
      }
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  get connectedClients(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
