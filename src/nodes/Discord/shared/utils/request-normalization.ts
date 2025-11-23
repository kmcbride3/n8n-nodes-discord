/**
 * Request normalization utilities for Discord nodes
 *
 * This module provides request normalization and canonicalization utilities
 * used for webhook signature verification and request body parsing.
 */

import crypto from 'crypto'
import { Collection } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

export interface NormalizedRequest {
  headers: Record<string, string>
  rawBody?: unknown
  body?: unknown
}

/**
 * Normalize a framework request object to a predictable shape
 *
 * Handles various request formats from different frameworks and environments.
 * Prefers rawBody/raw/bodyRaw for signature verification paths.
 *
 * @param maybeReq - The request object to normalize
 * @returns Normalized request with headers, rawBody, and body
 */
export function normalizeRequest(maybeReq: unknown): NormalizedRequest {
  if (!maybeReq || typeof maybeReq !== 'object') {
    return { headers: {}, rawBody: undefined, body: undefined }
  }

  const request = maybeReq as Record<string, unknown>

  try {
    return {
      headers: (request.headers as Record<string, string>) || {},
      rawBody: request.rawBody ?? request.bodyRaw ?? request.raw,
      body: request.body as unknown,
    }
  } catch (error) {
    LoggerProxy.warn('Failed to normalize request object', { error })
    return { headers: {}, rawBody: undefined, body: undefined }
  }
}

/**
 * Return a canonical string representation of the request body
 *
 * Used for signature verification. Prefers rawBody/raw/bodyRaw when present
 * and converts Buffer to utf8 string; otherwise falls back to stringified parsed body.
 *
 * @param maybeReq - The request object
 * @returns Canonical body string for signature verification
 */
export function getCanonicalBodyString(maybeReq: unknown): string {
  const nr = normalizeRequest(maybeReq)
  const raw = nr.rawBody ?? undefined

  if (raw && typeof raw === 'string') return raw
  if (raw && raw instanceof Buffer) return raw.toString('utf8')

  // If raw is an object (or absent), fall back to stringified parsed body
  try {
    if (nr.body && typeof nr.body === 'string') return nr.body
    return JSON.stringify(nr.body ?? {})
  } catch (err) {
    LoggerProxy.warn('Failed to stringify request body for canonicalization', { error: err })
    return ''
  }
}

/**
 * Return a SHA-256 hex digest of the canonical body string
 *
 * Useful for caching or quick equality checks where the full body
 * needn't be retained.
 *
 * @param maybeReq - The request object
 * @returns SHA-256 hash of the canonical body
 */
export function getCanonicalBodyHash(maybeReq: unknown): string {
  const body = getCanonicalBodyString(maybeReq)
  try {
    return crypto.createHash('sha256').update(body, 'utf8').digest('hex')
  } catch (err) {
    LoggerProxy.warn('Failed to compute canonical body hash', { error: err })
    return ''
  }
}

// Simple in-memory LRU cache for parsed canonical bodies
const PARSE_CACHE_MAX = 256
type CacheEntry = { parsed: unknown; lastAccess: number }
const parseCache = new Collection<string, CacheEntry>()

function touchCacheKey(key: string) {
  const entry = parseCache.get(key)
  if (!entry) return
  entry.lastAccess = Date.now()
  // move to end to preserve insertion-order LRU behavior
  parseCache.delete(key)
  parseCache.set(key, entry)
}

/**
 * Parse the canonical body and cache the result by SHA-256 hash
 *
 * Uses LRU cache to avoid re-parsing identical request bodies.
 * Returns the canonical string and the parsed value if parsing succeeded.
 *
 * @param maybeReq - The request object
 * @returns Object with bodyString and optional parsed body
 */
export function parseCanonicalBody(maybeReq: unknown): { bodyString: string; parsed?: unknown } {
  const bodyString = getCanonicalBodyString(maybeReq)
  const key = getCanonicalBodyHash(maybeReq)
  if (key && parseCache.has(key)) {
    touchCacheKey(key)
    return { bodyString, parsed: parseCache.get(key)?.parsed }
  }

  try {
    const parsed = bodyString ? JSON.parse(bodyString) : undefined
    if (key) {
      // Maintain cache size: evict least-recently-used entry based on lastAccess
      if (parseCache.size >= PARSE_CACHE_MAX) {
        // find least-recently-used entry by lastAccess
        let lruKey: string | undefined
        let lruTime = Number.POSITIVE_INFINITY
        for (const [k, v] of parseCache.entries()) {
          if (v.lastAccess < lruTime) {
            lruTime = v.lastAccess
            lruKey = k
          }
        }
        if (lruKey) parseCache.delete(lruKey)
      }
      parseCache.set(key, { parsed, lastAccess: Date.now() })
    }
    return { bodyString, parsed }
  } catch (err) {
    LoggerProxy.warn('Failed to parse canonical body', { error: err })
    return { bodyString }
  }
}
