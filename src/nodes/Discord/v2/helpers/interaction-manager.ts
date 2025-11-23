import { Client, Collection, MessageComponentInteraction, ReadonlyCollection } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'
import { LoggerProxy, NodeOperationError } from 'n8n-workflow'

import { isValidSnowflake } from './utils'

// Discord.js native constants for optimization
const DISCORD_DEFAULT_COLLECTOR_TIMEOUT = 15 * 60 * 1000 // 15 minutes (Discord.js default)
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MEMORY_PRESSURE_THRESHOLD = 100 // Max active collectors before cleanup
const INTERACTION_EXPIRY_TIME = 5 * 60 * 1000 // 5 minutes for interaction data
const PERFORMANCE_SAMPLE_SIZE = 100 // Sample size for performance metrics

/**
 * Enhanced interaction state management using Discord.js Collections
 * Replaces n8n API polling with native Discord.js collectors
 */

export interface IInteractionData {
  id: string
  type: 'button' | 'select'
  messageId: string
  channelId: string
  userId: string
  guildId: string
  customId: string
  values?: string[]
  timestamp: number
  workflowId?: string
  persistent: boolean
}

export interface IComponentState {
  messageId: string
  components: IInteractionData[]
  // Using the exact return type from message.createMessageComponentCollector()
  collector?: ReturnType<typeof import('discord.js').Message.prototype.createMessageComponentCollector>
  persistent: boolean
  timeout: number
  workflowId?: string
  restrictToRoles?: boolean
  restrictToTriggeringUser?: boolean
  mentionRoles?: string[]
  // Performance and memory management enhancements
  createdAt: number
  lastActivity: number
  interactionCount: number
  memoryWeight: number // Estimated memory usage
}

export interface ICollectorPerformanceMetrics {
  totalCollectors: number
  activeCollectors: number
  averageLifetime: number
  peakCollectors: number
  totalInteractions: number
  memoryUsage: number
  cleanupEvents: number
  disposalReasons: Map<string, number>
  performanceSamples: number[]
}

export interface IMemoryPressureInfo {
  isUnderPressure: boolean
  collectorCount: number
  threshold: number
  oldestCollectorAge: number
  memoryWeight: number
}

export interface IWorkflowTriggerData {
  type: 'interaction' | 'message' | 'command' | 'user_event'
  channelId: string
  userId: string
  messageId?: string
  interactionValues?: string[]
  content?: string
  attachments?: object[]
  userRoles?: string[]
  timestamp: number
}

/**
 * Discord.js Collections-based state manager
 * Replaces the legacy polling system with efficient Collections
 */
export class DiscordStateManager {
  // Active interaction collectors by message ID
  private activeCollectors = new Collection<string, IComponentState>()

  // Pending interactions awaiting processing
  private pendingInteractions = new Collection<string, IInteractionData>()

  // Workflow trigger data by execution ID
  private workflowTriggers = new Collection<string, IWorkflowTriggerData>()

  // Message to workflow mapping for persistent components
  private messageWorkflowMap = new Collection<string, string>()

  // Client reference for collectors
  private client: Client | null = null

  // Performance and memory management
  private performanceMetrics: ICollectorPerformanceMetrics = {
    totalCollectors: 0,
    activeCollectors: 0,
    averageLifetime: 0,
    peakCollectors: 0,
    totalInteractions: 0,
    memoryUsage: 0,
    cleanupEvents: 0,
    disposalReasons: new Map(),
    performanceSamples: [],
  }

  private memoryCleanupTimer: NodeJS.Timeout | null = null
  private isUnderMemoryPressure = false

  /**
   * Initialize the state manager with a Discord client
   * Includes automatic memory management setup
   */
  setClient(client: Client): void {
    this.client = client
    this.startMemoryManagement()
  }

  /**
   * Start automatic memory management using Discord.js native patterns
   */
  private startMemoryManagement(): void {
    // Clear any existing timer
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
    }

    // Set up automatic cleanup interval
    this.memoryCleanupTimer = setInterval(() => {
      this.performAutomaticCleanup()
    }, MEMORY_CLEANUP_INTERVAL)

    LoggerProxy.debug('Discord collector memory management started', {
      cleanupInterval: MEMORY_CLEANUP_INTERVAL,
      threshold: MEMORY_PRESSURE_THRESHOLD,
    })
  }

  /**
   * Perform automatic cleanup based on Discord.js native memory management
   */
  private performAutomaticCleanup(): void {
    const memoryInfo = this.getMemoryPressureInfo()

    // Update metrics
    this.isUnderMemoryPressure = memoryInfo.isUnderPressure
    this.performanceMetrics.cleanupEvents++

    if (this.isUnderMemoryPressure) {
      LoggerProxy.warn('Discord collector memory pressure detected', {
        collectorCount: memoryInfo.collectorCount,
        threshold: memoryInfo.threshold,
        oldestAge: memoryInfo.oldestCollectorAge,
        memoryWeight: memoryInfo.memoryWeight,
      })
      this.cleanupOldCollectors()
    }

    // Clean up expired interactions
    this.cleanupExpiredInteractions(INTERACTION_EXPIRY_TIME)

    // Update performance metrics
    this.updatePerformanceMetrics()
  }

  /**
   * Get memory pressure information
   */
  private getMemoryPressureInfo(): IMemoryPressureInfo {
    const collectorCount = this.activeCollectors.size
    const now = Date.now()

    let oldestAge = 0
    let totalMemoryWeight = 0

    for (const state of this.activeCollectors.values()) {
      const age = now - state.createdAt
      oldestAge = Math.max(oldestAge, age)
      totalMemoryWeight += state.memoryWeight
    }

    return {
      isUnderPressure: collectorCount > MEMORY_PRESSURE_THRESHOLD,
      collectorCount,
      threshold: MEMORY_PRESSURE_THRESHOLD,
      oldestCollectorAge: oldestAge,
      memoryWeight: totalMemoryWeight,
    }
  }

  /**
   * Clean up old collectors to reduce memory pressure
   */
  private cleanupOldCollectors(): void {
    const now = Date.now()
    const collectorsToRemove: string[] = []

    // Find non-persistent collectors older than Discord.js default timeout
    for (const [messageId, state] of this.activeCollectors) {
      if (!state.persistent && now - state.lastActivity > DISCORD_DEFAULT_COLLECTOR_TIMEOUT) {
        collectorsToRemove.push(messageId)
      }
    }

    // Remove old collectors
    for (const messageId of collectorsToRemove) {
      this.stopCollector(messageId)
      this.recordDisposalReason('memory_pressure_cleanup')
    }

    LoggerProxy.debug('Discord collector cleanup completed', {
      removed: collectorsToRemove.length,
      remaining: this.activeCollectors.size,
    })
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = Date.now()
    this.performanceMetrics.activeCollectors = this.activeCollectors.size
    this.performanceMetrics.peakCollectors = Math.max(
      this.performanceMetrics.peakCollectors,
      this.activeCollectors.size,
    )

    // Calculate average lifetime for completed collectors
    let totalLifetime = 0
    let completedCount = 0

    for (const state of this.activeCollectors.values()) {
      if (!state.collector || state.collector.ended) {
        totalLifetime += now - state.createdAt
        completedCount++
      }
    }

    if (completedCount > 0) {
      this.performanceMetrics.averageLifetime = totalLifetime / completedCount
    }

    // Add performance sample
    if (this.performanceMetrics.performanceSamples.length >= PERFORMANCE_SAMPLE_SIZE) {
      this.performanceMetrics.performanceSamples.shift()
    }
    this.performanceMetrics.performanceSamples.push(this.activeCollectors.size)
  }

  /**
   * Record disposal reason for metrics
   */
  private recordDisposalReason(reason: string): void {
    const current = this.performanceMetrics.disposalReasons.get(reason) || 0
    this.performanceMetrics.disposalReasons.set(reason, current + 1)
  }

  /**
   * Create an interaction collector for a message with interactive components
   * Replaces the old polling mechanism
   */
  createInteractionCollector(
    context: IExecuteFunctions,
    channelId: string,
    messageId: string,
    options: {
      timeout?: number
      persistent?: boolean
      workflowId?: string
      componentFilter?: (interaction: MessageComponentInteraction) => boolean
    } = {},
  ) {
    if (!this.client) {
      throw new NodeOperationError(context.getNode(), 'Discord client not set. Call setClient() first.')
    }

    const { timeout = 60000, persistent = false, workflowId, componentFilter } = options

    // Validate Discord IDs using Discord.js patterns
    if (!isValidSnowflake(channelId)) {
      throw new NodeOperationError(
        context.getNode(),
        `Invalid channel ID: "${channelId}" is not a valid Discord snowflake ID`,
      )
    }
    if (!isValidSnowflake(messageId)) {
      throw new NodeOperationError(
        context.getNode(),
        `Invalid message ID: "${messageId}" is not a valid Discord snowflake ID`,
      )
    }

    // Get the message to create collector on
    const channel = this.client.channels.cache.get(channelId)
    if (!channel || !('messages' in channel)) {
      throw new NodeOperationError(context.getNode(), `Channel ${channelId} not found or doesn't support messages`)
    }

    // Optimize collector creation with Discord.js native patterns
    const effectiveTimeout = persistent ? undefined : Math.min(timeout, DISCORD_DEFAULT_COLLECTOR_TIMEOUT)

    // Create the collector with optimized Discord.js native filter
    const collector = channel.createMessageComponentCollector({
      filter: (interaction) => {
        // Performance-optimized filter using Discord.js native patterns
        // Early return for message ID mismatch (most common case)
        if (interaction.message.id !== messageId) return false

        // Apply custom filter if provided
        if (componentFilter && !componentFilter(interaction)) return false

        return true
      },
      time: effectiveTimeout,
      // Use Discord.js native disposal for memory management
      dispose: true,
    })

    // Store collector state with performance tracking
    const now = Date.now()
    const componentState: IComponentState = {
      messageId,
      components: [],
      collector,
      persistent,
      timeout,
      workflowId,
      // Performance and memory management
      createdAt: now,
      lastActivity: now,
      interactionCount: 0,
      memoryWeight: 1, // Base weight, increases with interactions
    }

    this.activeCollectors.set(messageId, componentState)

    // Update performance metrics
    this.performanceMetrics.totalCollectors++

    // Set up collector event handlers with performance optimization
    collector.on('collect', (interaction) => {
      this.handleInteraction(interaction, componentState)
    })

    collector.on('end', (collected, reason) => {
      this.handleCollectorEnd(messageId, collected, reason)
    })

    // Add error handling for collector lifecycle
    collector.on('dispose', (interaction) => {
      LoggerProxy.debug('Discord collector disposed interaction', {
        messageId,
        interactionId: interaction.id,
        customId: interaction.customId,
      })
    })

    // Map message to workflow for persistent components
    if (persistent && workflowId) {
      this.messageWorkflowMap.set(messageId, workflowId)
    }

    return collector
  }

  /**
   * Handle collected interactions with performance optimization
   * Replaces the legacy triggerWorkflow HTTP polling
   */
  private handleInteraction(interaction: MessageComponentInteraction, componentState: IComponentState): void {
    // Update performance tracking
    const now = Date.now()
    componentState.lastActivity = now
    componentState.interactionCount++
    componentState.memoryWeight += 0.1 // Incremental weight increase

    this.performanceMetrics.totalInteractions++
    const interactionData: IInteractionData = {
      id: `${interaction.id}_${Date.now()}`,
      type: interaction.isButton() ? 'button' : 'select',
      messageId: interaction.message.id,
      channelId: interaction.channelId || '',
      userId: interaction.user.id,
      guildId: interaction.guildId || '',
      customId: interaction.customId,
      values: interaction.isStringSelectMenu() ? interaction.values : undefined,
      timestamp: Date.now(),
      workflowId: componentState.workflowId,
      persistent: componentState.persistent,
    }

    // Store the interaction data
    this.pendingInteractions.set(interactionData.id, interactionData)
    componentState.components.push(interactionData)

    // Get user roles safely
    let userRoles: string[] = []
    if (interaction.member?.roles) {
      if (interaction.member && 'roles' in interaction.member && 'cache' in interaction.member.roles) {
        userRoles = interaction.member.roles.cache.map((role) => role.id) || []
      } else if (Array.isArray(interaction.member.roles)) {
        userRoles = interaction.member.roles
      }
    }

    // Create workflow trigger data
    const triggerData: IWorkflowTriggerData = {
      type: 'interaction',
      channelId: interaction.channelId || '',
      userId: interaction.user.id,
      messageId: interaction.message.id,
      interactionValues: interaction.isStringSelectMenu() ? interaction.values : [interaction.customId],
      userRoles,
      timestamp: Date.now(),
    }

    this.workflowTriggers.set(interactionData.id, triggerData)

    // Defer the interaction to prevent timeout
    if (!interaction.deferred && !interaction.replied) {
      interaction
        .deferUpdate()
        .catch((error) =>
          LoggerProxy.error('Failed to defer Discord interaction', { error, interactionId: interaction.id }),
        )
    }
  }

  /**
   * Handle collector end events with performance tracking
   */
  private handleCollectorEnd(
    messageId: string,
    collected: ReadonlyCollection<string, MessageComponentInteraction>,
    reason: string,
  ): void {
    const componentState = this.activeCollectors.get(messageId)
    if (!componentState) return

    // Record disposal reason for metrics
    this.recordDisposalReason(reason)

    // Calculate collector lifetime for metrics
    const lifetime = Date.now() - componentState.createdAt

    // Remove non-persistent collectors
    if (!componentState.persistent) {
      this.activeCollectors.delete(messageId)
      this.messageWorkflowMap.delete(messageId)
    }

    LoggerProxy.debug('Discord collector ended', {
      messageId,
      reason,
      collectedCount: collected.size,
      persistent: componentState.persistent,
      lifetime,
      interactionCount: componentState.interactionCount,
      memoryWeight: componentState.memoryWeight,
    })
  }

  /**
   * Get pending interactions for processing
   * Replaces the old polling mechanism
   */
  getPendingInteractions(workflowId?: string): IInteractionData[] {
    const interactions = Array.from(this.pendingInteractions.values())

    if (workflowId) {
      return interactions.filter((interaction) => interaction.workflowId === workflowId)
    }

    return interactions
  }

  /**
   * Get workflow trigger data for an interaction
   */
  getWorkflowTriggerData(interactionId: string): IWorkflowTriggerData | undefined {
    return this.workflowTriggers.get(interactionId)
  }

  /**
   * Mark interaction as processed
   */
  markInteractionProcessed(interactionId: string): void {
    this.pendingInteractions.delete(interactionId)
    this.workflowTriggers.delete(interactionId)
  }

  /**
   * Clean up expired interactions with performance optimization
   */
  cleanupExpiredInteractions(maxAge = INTERACTION_EXPIRY_TIME): void {
    const now = Date.now()
    let cleanedCount = 0

    // Use Discord.js Collection's efficient iteration
    for (const [id, interaction] of this.pendingInteractions) {
      if (now - interaction.timestamp > maxAge) {
        this.pendingInteractions.delete(id)
        this.workflowTriggers.delete(id)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      LoggerProxy.debug('Discord interaction cleanup completed', {
        cleanedInteractions: cleanedCount,
        remainingInteractions: this.pendingInteractions.size,
        maxAge,
      })
    }
  }

  /**
   * Get active collector for a message
   */
  getCollector(messageId: string): IComponentState | undefined {
    return this.activeCollectors.get(messageId)
  }

  /**
   * Stop and remove a collector with performance tracking
   */
  stopCollector(messageId: string): void {
    const componentState = this.activeCollectors.get(messageId)
    if (componentState?.collector) {
      // Use Discord.js native disposal
      componentState.collector.stop('manual_stop')
      this.recordDisposalReason('manual_stop')
    }
    this.activeCollectors.delete(messageId)
    this.messageWorkflowMap.delete(messageId)
  }

  /**
   * Get all active collectors
   */
  getActiveCollectors(): Collection<string, IComponentState> {
    return this.activeCollectors
  }

  /**
   * Check if a message has an active collector
   */
  hasActiveCollector(messageId: string): boolean {
    return this.activeCollectors.has(messageId)
  }

  /**
   * Get workflow ID for a message (for persistent components)
   */
  getWorkflowIdForMessage(messageId: string): string | undefined {
    return this.messageWorkflowMap.get(messageId)
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    activeCollectors: number
    pendingInteractions: number
    workflowTriggers: number
    messageWorkflowMappings: number
  } {
    return {
      activeCollectors: this.activeCollectors.size,
      pendingInteractions: this.pendingInteractions.size,
      workflowTriggers: this.workflowTriggers.size,
      messageWorkflowMappings: this.messageWorkflowMap.size,
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): ICollectorPerformanceMetrics {
    return {
      ...this.performanceMetrics,
      memoryUsage: this.calculateMemoryUsage(),
    }
  }

  /**
   * Get current memory pressure status (public method)
   */
  getMemoryPressureStatus(): IMemoryPressureInfo {
    const info = this.getMemoryPressureInfo()
    this.isUnderMemoryPressure = info.isUnderPressure
    return info
  }

  /**
   * Calculate estimated memory usage
   */
  private calculateMemoryUsage(): number {
    let totalWeight = 0
    for (const state of this.activeCollectors.values()) {
      totalWeight += state.memoryWeight
    }
    return totalWeight
  }

  /**
   * Force memory cleanup (useful for testing or emergency cleanup)
   */
  forceMemoryCleanup(): void {
    this.performAutomaticCleanup()
    LoggerProxy.info('Discord collector forced memory cleanup completed', {
      activeCollectors: this.activeCollectors.size,
      memoryWeight: this.calculateMemoryUsage(),
    })
  }

  /**
   * Clear all state (useful for cleanup/restart)
   */
  clear(): void {
    // Stop memory management timer
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
      this.memoryCleanupTimer = null
    }

    // Stop all active collectors
    for (const [messageId] of this.activeCollectors) {
      this.stopCollector(messageId)
    }

    this.activeCollectors.clear()
    this.pendingInteractions.clear()
    this.workflowTriggers.clear()
    this.messageWorkflowMap.clear()

    // Reset performance metrics
    this.performanceMetrics = {
      totalCollectors: 0,
      activeCollectors: 0,
      averageLifetime: 0,
      peakCollectors: 0,
      totalInteractions: 0,
      memoryUsage: 0,
      cleanupEvents: 0,
      disposalReasons: new Map(),
      performanceSamples: [],
    }

    this.isUnderMemoryPressure = false

    LoggerProxy.info('Discord state manager cleared and reset')
  }
}

// Global instance
export const discordStateManager = new DiscordStateManager()

/**
 * Helper function to create n8n-compatible workflow execution data
 * from Discord.js Collections data
 * Converts Discord trigger events into n8n workflow input format
 *
 * @param triggerData - Discord workflow trigger data
 * @param interactionData - Optional interaction-specific data
 * @returns n8n-compatible workflow execution data object
 *
 * @example
 * const data = createWorkflowExecutionData(triggerData, interactionData);
 */
export function createWorkflowExecutionData(
  triggerData: IWorkflowTriggerData,
  interactionData?: IInteractionData,
): object {
  const baseData = {
    channelId: triggerData.channelId,
    userId: triggerData.userId,
    timestamp: new Date(triggerData.timestamp).toISOString(),
    type: triggerData.type,
  }

  // Add interaction-specific data
  if (triggerData.type === 'interaction' && interactionData) {
    return {
      ...baseData,
      messageId: triggerData.messageId,
      interactionValues: triggerData.interactionValues,
      userRoles: triggerData.userRoles,
      customId: interactionData.customId,
      interactionType: interactionData.type,
      persistent: interactionData.persistent,
    }
  }

  // Add message-specific data
  if (triggerData.type === 'message') {
    return {
      ...baseData,
      content: triggerData.content,
      attachments: triggerData.attachments,
      messageId: triggerData.messageId,
    }
  }

  return baseData
}

/**
 * Integration function for n8n workflow execution
 * Replaces the HTTP polling with direct Discord.js data
 */
export async function executeWorkflowFromDiscordInteraction(
  this: IExecuteFunctions,
  interactionId: string,
): Promise<object | null> {
  const interactionData = discordStateManager.getPendingInteractions().find((i) => i.id === interactionId)
  const triggerData = discordStateManager.getWorkflowTriggerData(interactionId)

  if (!interactionData || !triggerData) {
    throw new NodeOperationError(this.getNode(), `Interaction data not found for ID: ${interactionId}`)
  }

  // Create execution data
  const executionData = createWorkflowExecutionData(triggerData, interactionData)

  // Mark as processed
  discordStateManager.markInteractionProcessed(interactionId)

  return executionData
}
