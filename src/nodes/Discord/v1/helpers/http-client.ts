/**
 * HTTP Client Utilities for V1 Bot Operations
 *
 * This module provides HTTP client functions for n8n webhook execution
 * and execution status polling. These are legacy V1 utilities maintained
 * for backward compatibility with existing bot operations.
 *
 * Note: These functions handle n8n API communication, NOT Discord API operations.
 * Discord API operations use Discord.js built-in HTTP client with automatic
 * rate limiting and retry logic.
 *
 * @module v2/helpers/http-client
 */

import { LoggerProxy } from 'n8n-workflow'

/**
 * Execution status response from n8n API
 */
export interface IExecutionStatusResponse {
  finished: boolean
  stoppedAt: string | null
  data?: {
    resultData?: {
      error?: string
    }
  }
}

/**
 * Executes a webhook POST request to n8n
 *
 * Legacy function for V1 bot webhook execution. Sends webhook payloads
 * to n8n workflow endpoints. Uses Node.js native fetch for HTTP requests.
 *
 * @param url - The n8n webhook URL
 * @param payload - The webhook payload data
 * @param headers - Optional HTTP headers
 * @returns Promise resolving to true on success, false on failure
 *
 * @example
 * const success = await executeWebhook(webhookUrl, { event: 'message' }, { 'Content-Type': 'application/json' });
 */
export async function executeWebhook(
  url: string,
  payload: unknown,
  headers: Record<string, string> = {},
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      LoggerProxy.warn('Webhook execution failed', {
        status: response.status,
        statusText: response.statusText,
        url,
      })
      return false
    }

    return true
  } catch (error) {
    LoggerProxy.error('Webhook execution error', {
      error: error instanceof Error ? error.message : String(error),
      url,
    })
    return false
  }
}

/**
 * Checks the status of an n8n workflow execution
 *
 * Legacy function for V1 bot execution polling. Polls n8n API to check
 * if a workflow execution has completed. Used for managing placeholder
 * messages that update when workflows finish.
 *
 * Note: This polls n8n's execution API, not Discord's API. Discord.js
 * handles its own API communication with automatic retries and rate limiting.
 *
 * @param baseUrl - The n8n instance base URL
 * @param executionId - The workflow execution ID to check
 * @param apiKey - The n8n API key for authentication
 * @returns Promise resolving to execution status, or null on error
 *
 * @example
 * const status = await checkExecutionStatus(baseUrl, executionId, apiKey);
 * if (status && status.finished) {
 *   console.log('Execution completed!');
 * }
 */
export async function checkExecutionStatus(
  baseUrl: string,
  executionId: string,
  apiKey: string,
): Promise<IExecutionStatusResponse | null> {
  try {
    const url = `${baseUrl}/rest/executions/${executionId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      LoggerProxy.warn('Execution status check failed', {
        status: response.status,
        statusText: response.statusText,
        executionId,
      })
      return null
    }

    const data = (await response.json()) as IExecutionStatusResponse

    return {
      finished: data.finished || false,
      stoppedAt: data.stoppedAt || null,
      data: data.data,
    }
  } catch (error) {
    LoggerProxy.error('Execution status check error', {
      error: error instanceof Error ? error.message : String(error),
      executionId,
    })
    return null
  }
}
