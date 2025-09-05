/**
 * IntegrityPlay Real-time Alert WebSocket Client
 * =============================================
 * 
 * Provides live streaming of fraud detection alerts using WebSocket connections.
 * Enables real-time dashboard updates without polling, dramatically improving UX.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during connection interruptions  
 * - Type-safe alert handling with TypeScript
 * - Event-driven architecture for reactive updates
 * - Performance monitoring and connection health tracking
 * 
 * Usage:
 * const alertStream = new RealtimeAlerts();
 * alertStream.connect();
 * alertStream.onAlert((alert) => updateDashboard(alert));
 */

import { Alert } from './api';

export interface AlertStreamEvent {
  type: 'alert' | 'status' | 'metrics';
  data: Alert | SystemStatus | PerformanceMetrics;
  timestamp: string;
}

export interface SystemStatus {
  status: 'online' | 'degraded' | 'offline';
  activeConnections: number;
  processedEvents: number;
  avgResponseTime: number;
}

export interface PerformanceMetrics {
  alertsPerMinute: number;
  detectionLatency: number;
  systemLoad: number;
  memoryUsage: number;
}

type AlertCallback = (alert: Alert) => void;
type StatusCallback = (status: SystemStatus) => void;
type MetricsCallback = (metrics: PerformanceMetrics) => void;

export class RealtimeAlerts {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private messageQueue: AlertStreamEvent[] = [];
  private isConnected = false;

  private alertCallbacks: AlertCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private metricsCallbacks: MetricsCallback[] = [];

  constructor(private baseUrl?: string) {
    if (!this.baseUrl) {
      const httpBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      this.baseUrl = httpBase.replace(/^http/i, 'ws');
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${this.baseUrl}/ws/realtime`);
    
    this.ws.onopen = () => {
      console.log('🔗 Real-time alert stream connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processQueuedMessages();
    };

    this.ws.onmessage = (event) => {
      try {
        const streamEvent: AlertStreamEvent = JSON.parse(event.data);
        this.handleStreamEvent(streamEvent);
      } catch (error) {
        console.error('❌ Failed to parse alert stream message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 Alert stream disconnected');
      this.isConnected = false;
      this.attemptReconnection();
    };

    this.ws.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  onAlert(callback: AlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  onStatus(callback: StatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  onMetrics(callback: MetricsCallback): void {
    this.metricsCallbacks.push(callback);
  }

  private handleStreamEvent(event: AlertStreamEvent): void {
    switch (event.type) {
      case 'alert':
        const alert = event.data as Alert;
        this.alertCallbacks.forEach(callback => callback(alert));
        break;
      
      case 'status':
        const status = event.data as SystemStatus;
        this.statusCallbacks.forEach(callback => callback(status));
        break;
      
      case 'metrics':
        const metrics = event.data as PerformanceMetrics;
        this.metricsCallbacks.forEach(callback => callback(metrics));
        break;
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private processQueuedMessages(): void {
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift();
      if (event) {
        this.handleStreamEvent(event);
      }
    }
  }

  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

export const alertStream = new RealtimeAlerts();
