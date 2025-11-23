import type { MessageComponentInteraction } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

import type { ICollectorPerformanceMetrics, IMemoryPressureInfo } from '../interaction-manager'

/**
 * Advanced performance monitoring for Discord.js collectors
 * Provides insights into collector lifecycle, memory usage, and optimization opportunities
 */

export interface IPerformanceReport {
  timestamp: number
  summary: {
    activeCollectors: number
    totalCollectors: number
    memoryUsage: number
    averageLifetime: number
    peakCollectors: number
  }
  insights: {
    memoryPressure: boolean
    performanceTrend: 'improving' | 'degrading' | 'stable'
    recommendations: string[]
  }
  details: {
    disposalReasons: Record<string, number>
    performanceSamples: number[]
    recentActivity: number
  }
}

export class CollectorPerformanceMonitor {
  private performanceHistory: IPerformanceReport[] = []
  private readonly maxHistorySize = 100
  private lastReportTime = 0

  /**
   * Generate a comprehensive performance report
   */
  generateReport(metrics: ICollectorPerformanceMetrics, memoryInfo: IMemoryPressureInfo): IPerformanceReport {
    const now = Date.now()
    const timeSinceLastReport = now - this.lastReportTime

    const report: IPerformanceReport = {
      timestamp: now,
      summary: {
        activeCollectors: metrics.activeCollectors,
        totalCollectors: metrics.totalCollectors,
        memoryUsage: metrics.memoryUsage,
        averageLifetime: metrics.averageLifetime,
        peakCollectors: metrics.peakCollectors,
      },
      insights: {
        memoryPressure: memoryInfo.isUnderPressure,
        performanceTrend: this.calculatePerformanceTrend(),
        recommendations: this.generateRecommendations(metrics, memoryInfo),
      },
      details: {
        disposalReasons: Object.fromEntries(metrics.disposalReasons),
        performanceSamples: [...metrics.performanceSamples],
        recentActivity: timeSinceLastReport,
      },
    }

    // Store in history
    this.performanceHistory.push(report)
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift()
    }

    this.lastReportTime = now
    return report
  }

  /**
   * Calculate performance trend based on historical data
   */
  private calculatePerformanceTrend(): 'improving' | 'degrading' | 'stable' {
    if (this.performanceHistory.length < 3) return 'stable'

    const recent = this.performanceHistory.slice(-3)
    const memoryTrend = recent.map((r) => r.summary.memoryUsage)
    const collectorTrend = recent.map((r) => r.summary.activeCollectors)

    // Simple trend analysis
    const memoryIncreasing = memoryTrend[2] > memoryTrend[0] * 1.2
    const collectorsIncreasing = collectorTrend[2] > collectorTrend[0] * 1.2

    if (memoryIncreasing || collectorsIncreasing) return 'degrading'
    if (memoryTrend[2] < memoryTrend[0] * 0.8 && collectorTrend[2] < collectorTrend[0] * 0.8) return 'improving'

    return 'stable'
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: ICollectorPerformanceMetrics, memoryInfo: IMemoryPressureInfo): string[] {
    const recommendations: string[] = []

    // Memory pressure recommendations
    if (memoryInfo.isUnderPressure) {
      recommendations.push('Consider reducing collector timeout duration')
      recommendations.push('Review persistent collector usage patterns')
      if (memoryInfo.oldestCollectorAge > 30 * 60 * 1000) {
        // 30 minutes
        recommendations.push('Some collectors are running longer than 30 minutes - review necessity')
      }
    }

    // Performance recommendations
    if (metrics.averageLifetime > 10 * 60 * 1000) {
      // 10 minutes
      recommendations.push('Average collector lifetime is high - consider shorter timeouts')
    }

    if (metrics.peakCollectors > 50) {
      recommendations.push('Peak collector count exceeded 50 - monitor for memory leaks')
    }

    // Disposal pattern analysis
    const manualStops = metrics.disposalReasons.get('manual_stop') || 0
    const timeouts = metrics.disposalReasons.get('time') || 0
    const total = manualStops + timeouts

    if (total > 0 && manualStops / total > 0.7) {
      recommendations.push('High manual stop rate - consider automatic timeout optimization')
    }

    if (recommendations.length === 0) {
      recommendations.push('Collector performance is optimal')
    }

    return recommendations
  }

  /**
   * Log performance report to n8n logger
   */
  logPerformanceReport(report: IPerformanceReport, level: 'debug' | 'info' | 'warn' = 'debug'): void {
    const logData = {
      activeCollectors: report.summary.activeCollectors,
      memoryUsage: report.summary.memoryUsage,
      memoryPressure: report.insights.memoryPressure,
      performanceTrend: report.insights.performanceTrend,
      recommendations: report.insights.recommendations.length,
    }

    switch (level) {
      case 'warn':
        LoggerProxy.warn('Discord collector performance report', logData)
        break
      case 'info':
        LoggerProxy.info('Discord collector performance report', logData)
        break
      default:
        LoggerProxy.debug('Discord collector performance report', logData)
    }

    // Log detailed recommendations if any critical issues
    if (report.insights.memoryPressure || report.insights.performanceTrend === 'degrading') {
      LoggerProxy.info('Discord collector performance recommendations', {
        recommendations: report.insights.recommendations,
      })
    }
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): IPerformanceReport[] {
    return [...this.performanceHistory]
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.performanceHistory = []
    this.lastReportTime = 0
  }

  /**
   * Get current performance insights
   */
  getCurrentInsights(): {
    isHealthy: boolean
    criticalIssues: string[]
    optimizationOpportunities: string[]
  } {
    if (this.performanceHistory.length === 0) {
      return {
        isHealthy: true,
        criticalIssues: [],
        optimizationOpportunities: [],
      }
    }

    const latest = this.performanceHistory[this.performanceHistory.length - 1]
    const criticalIssues: string[] = []
    const optimizationOpportunities: string[] = []

    // Identify critical issues
    if (latest.insights.memoryPressure) {
      criticalIssues.push('Memory pressure detected')
    }

    if (latest.insights.performanceTrend === 'degrading') {
      criticalIssues.push('Performance trend is degrading')
    }

    if (latest.summary.activeCollectors > 100) {
      criticalIssues.push('Excessive active collectors')
    }

    // Identify optimization opportunities
    if (latest.summary.averageLifetime > 15 * 60 * 1000) {
      optimizationOpportunities.push('Reduce collector timeout durations')
    }

    const disposalReasons = latest.details.disposalReasons
    if (disposalReasons.manual_stop && disposalReasons.manual_stop > disposalReasons.time) {
      optimizationOpportunities.push('Optimize automatic timeout settings')
    }

    return {
      isHealthy: criticalIssues.length === 0,
      criticalIssues,
      optimizationOpportunities,
    }
  }
}

// Global performance monitor instance
export const collectorPerformanceMonitor = new CollectorPerformanceMonitor()

/**
 * Discord.js native performance optimization utilities
 */
export const DiscordPerformanceUtils = {
  /**
   * Calculate optimal timeout based on Discord.js patterns
   */
  calculateOptimalTimeout(interactionType: 'button' | 'select', isPersistent: boolean): number {
    if (isPersistent) return 0 // Return 0 for persistent collectors (unlimited timeout)

    // Use Discord.js recommended timeouts
    switch (interactionType) {
      case 'button':
        return 2 * 60 * 1000 // 2 minutes for buttons
      case 'select':
        return 5 * 60 * 1000 // 5 minutes for select menus
      default:
        return 60 * 1000 // 1 minute default
    }
  },

  /**
   * Create optimized filter function using Discord.js patterns
   */
  createOptimizedFilter(
    targetMessageId: string,
    customIds?: string[],
    userId?: string,
  ): (interaction: MessageComponentInteraction) => boolean {
    return (interaction: MessageComponentInteraction) => {
      // Early return optimizations using Discord.js native properties
      if (interaction.message?.id !== targetMessageId) return false
      if (userId && interaction.user?.id !== userId) return false
      if (customIds && !customIds.includes(interaction.customId)) return false

      return true
    }
  },

  /**
   * Discord.js native memory optimization recommendations
   */
  getMemoryOptimizationTips(): string[] {
    return [
      'Use Discord.js native disposal with dispose: true option',
      'Leverage Discord.js automatic cleanup after 15 minutes',
      'Prefer channel.createMessageComponentCollector() over custom implementations',
      'Use Discord.js Collection instead of native Maps for better performance',
      'Implement proper filter functions to reduce unnecessary processing',
      'Use Discord.js native timeout handling instead of custom timers',
      'Clean up event listeners when collectors end',
      'Avoid storing large objects in collector state',
    ]
  },
}
