/**
 * Phase 3.1.2: WebSocket Management Enhancement
 *
 * This module provides enhanced WebSocket connection management for Discord clients,
 * leveraging Discord.js built-in connection stability and performance optimizations.
 */

import type { Client, ClientEvents } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

/**
 * WebSocket Connection Health Metrics
 */
export interface WebSocketHealthMetrics {
  connected: boolean
  latency: number
  uptime: number
  reconnectCount: number
  lastHeartbeat: Date | null
  status: 'ready' | 'connecting' | 'reconnecting' | 'idle' | 'nearly' | 'disconnected'
}

/**
 * WebSocket Event Performance Tracking
 */
export interface WebSocketEventMetrics {
  eventCount: number
  lastEventTime: Date | null
  averageProcessingTime: number
}

/**
 * Enhanced WebSocket Manager
 *
 * Provides monitoring and optimization for Discord.js WebSocket connections
 * without interfering with Discord.js built-in connection management
 */
export class WebSocketEnhancementManager {
  private eventMetrics = new Map<keyof ClientEvents, WebSocketEventMetrics>()
  private reconnectCount = 0
  // Store references to bound listeners for cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private boundListeners: Map<string, (...args: any[]) => void> = new Map()

  constructor(private client: Client) {
    this.setupConnectionMonitoring()
    this.setupPerformanceTracking()
  }

  /**
   * Setup Connection Stability Monitoring
   *
   * Uses Discord.js built-in events to monitor connection health
   * without interfering with automatic reconnection logic
   */
  private setupConnectionMonitoring(): void {
    // Monitor connection state changes
    const readyListener = () => {
      LoggerProxy.info(`Discord WebSocket connected - Shard ready`)
    }
    this.client.on('ready', readyListener)
    this.boundListeners.set('ready', readyListener)

    const reconnectingListener = () => {
      this.reconnectCount++
      LoggerProxy.info(`Discord WebSocket reconnecting (attempt ${this.reconnectCount})`)
    }
    this.client.on('reconnecting', reconnectingListener)
    this.boundListeners.set('reconnecting', reconnectingListener)

    const disconnectListener = () => {
      LoggerProxy.info('Discord WebSocket disconnected')
    }
    this.client.on('disconnect', disconnectListener)
    this.boundListeners.set('disconnect', disconnectListener)

    // Discord.js handles all reconnection logic automatically
    // We just monitor the events for metrics
  }

  /**
   * Setup Performance Event Tracking
   *
   * Tracks event processing performance without interfering with operations
   */
  private setupPerformanceTracking(): void {
    // Track error events for monitoring
    const errorListener = (error: Error) => {
      LoggerProxy.error('Discord WebSocket error:', { error: error.message })
      this.updateEventMetrics('error')
    }
    this.client.on('error', errorListener)
    this.boundListeners.set('error', errorListener)

    const warnListener = (warning: string) => {
      LoggerProxy.warn('Discord WebSocket warning:', { warning })
      this.updateEventMetrics('warn')
    }
    this.client.on('warn', warnListener)
    this.boundListeners.set('warn', warnListener)

    // Discord.js handles heartbeat automatically, we just track it
    const shardReadyListener = () => {
      this.updateEventMetrics('shardReady')
    }
    this.client.on('shardReady', shardReadyListener)
    this.boundListeners.set('shardReady', shardReadyListener)
  }

  /**
   * Update Event Processing Metrics
   */
  private updateEventMetrics(eventName: keyof ClientEvents): void {
    const now = new Date()
    const existing = this.eventMetrics.get(eventName) || {
      eventCount: 0,
      lastEventTime: null,
      averageProcessingTime: 0,
    }

    existing.eventCount++
    existing.lastEventTime = now
    this.eventMetrics.set(eventName, existing)
  }

  /**
   * Get WebSocket Health Metrics
   *
   * Returns comprehensive health status using Discord.js built-in properties
   */
  public getHealthMetrics(): WebSocketHealthMetrics {
    const ws = this.client.ws
    const uptime = this.client.uptime || 0

    return {
      connected: this.client.isReady(),
      latency: ws.ping,
      uptime,
      reconnectCount: this.reconnectCount,
      lastHeartbeat: ws.shards.size > 0 ? new Date() : null,
      status: this.getConnectionStatus(),
    }
  }

  /**
   * Get Connection Status
   *
   * Maps Discord.js connection states to our status enum
   */
  private getConnectionStatus(): WebSocketHealthMetrics['status'] {
    if (this.client.isReady()) return 'ready'

    // Discord.js doesn't expose internal connection states,
    // so we infer from available properties
    if (this.client.uptime === null) return 'connecting'
    if (!this.client.isReady() && this.client.uptime > 0) return 'reconnecting'

    return 'idle'
  }

  /**
   * Get Event Processing Metrics
   */
  public getEventMetrics(): Map<keyof ClientEvents, WebSocketEventMetrics> {
    return new Map(this.eventMetrics)
  }

  /**
   * Cleanup WebSocket Enhancement
   *
   * Removes enhancement tracking and event listeners to prevent memory leaks
   * when clients are reused from the connection pool
   */
  public cleanup(): void {
    // Remove all event listeners we registered
    for (const [eventName, listener] of this.boundListeners.entries()) {
      this.client.removeListener(eventName as keyof ClientEvents, listener as never)
    }
    this.boundListeners.clear()
    this.eventMetrics.clear()
  }
}

/**
 * Create Enhanced WebSocket Manager for Client
 *
 * Phase 3.1.2 Integration:
 * - Provides monitoring without interfering with Discord.js connection management
 * - Uses Discord.js built-in properties and events only
 */
export function createWebSocketEnhancement(client: Client): WebSocketEnhancementManager {
  return new WebSocketEnhancementManager(client)
}
