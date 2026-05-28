import { JobProgressUpdate, WSMessage } from '@/types';

type ProgressCallback = (update: JobProgressUpdate) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<ProgressCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private currentAssignmentId: string | null = null;

  connect(assignmentId?: string): void {
    if (typeof window === 'undefined') return;

    this.currentAssignmentId = assignmentId || null;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    const url = assignmentId
      ? `${wsUrl}/ws?assignmentId=${assignmentId}`
      : `${wsUrl}/ws`;

    if (this.ws?.readyState === WebSocket.OPEN) {
      if (assignmentId) {
        this.ws.send(JSON.stringify({ type: 'subscribe', assignmentId }));
      }
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          if (msg.type === 'ping') return;

          const update = msg.data as JobProgressUpdate;
          if (update?.assignmentId) {
            const subs = this.subscribers.get(update.assignmentId);
            subs?.forEach((cb) => cb(update));

            // Also notify wildcard subscribers
            const wildcardSubs = this.subscribers.get('*');
            wildcardSubs?.forEach((cb) => cb(update));
          }
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        console.warn('WebSocket error');
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  subscribe(assignmentId: string, callback: ProgressCallback): () => void {
    if (!this.subscribers.has(assignmentId)) {
      this.subscribers.set(assignmentId, new Set());
    }
    this.subscribers.get(assignmentId)!.add(callback);

    // Subscribe on server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', assignmentId }));
    } else {
      this.connect(assignmentId);
    }

    return () => {
      this.subscribers.get(assignmentId)?.delete(callback);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', assignmentId }));
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentAssignmentId || undefined);
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsManager = new WebSocketManager();
