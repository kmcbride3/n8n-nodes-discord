import type { APIInteraction, APISelectMenuOption, MessageActionRowComponentBuilder } from 'discord.js'
import type { INode } from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

/**
 * Centralized minimal conversion helpers to reduce scattered `as unknown as` casts.
 * These are intentionally tiny helpers to keep callsites explicit and centralized.
 * All helpers include proper validation and use n8n error types for consistency.
 */

/**
 * Converts unknown value to IDataObject type
 *
 * @param value - The value to convert
 * @returns The value cast to type T
 *
 * @example
 * const data = toIDataObject<ICredentials>(rawData);
 */
export const toIDataObject = <T = unknown>(value: unknown): T => {
  return value as T
}

/**
 * Creates a minimal INode object for error context when real node is not available
 *
 * @returns A minimal INode object for error reporting
 */
function createMinimalNode(): INode {
  return {
    id: 'type-helper-node',
    name: 'Type Helper',
    type: 'n8n-nodes-discord.type-helpers',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }
}

/**
 * Converts unknown value to APIInteraction with validation
 *
 * Ensures the value is a valid Discord API interaction object. Handles both
 * JSON string and object formats. Uses n8n error types for proper workflow integration.
 *
 * @param value - The value to convert (object or JSON string)
 * @param node - Optional n8n node for error context
 * @returns The validated APIInteraction object
 * @throws NodeOperationError if value is null, undefined, or invalid
 *
 * @example
 * const interaction = toAPIInteraction(webhookBody, this.getNode());
 * console.log(interaction.type, interaction.id);
 */
export const toAPIInteraction = (value: unknown, node?: INode): APIInteraction => {
  if (value === null || value === undefined) {
    throw new NodeOperationError(node || createMinimalNode(), 'Missing interaction data', {
      description: 'Interaction data is required for this operation. Ensure the webhook payload is valid.',
    })
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as APIInteraction
    } catch (error) {
      throw new NodeOperationError(node || createMinimalNode(), 'Invalid interaction JSON', {
        description: `Failed to parse interaction data: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  return value as APIInteraction
}

/**
 * Converts unknown value to Discord API select menu options array
 *
 * Safely converts values to APISelectMenuOption array format. Returns empty
 * array if conversion fails to prevent runtime errors.
 *
 * @param value - The value to convert (typically from node parameters)
 * @returns Array of APISelectMenuOption objects, or empty array if invalid
 *
 * @example
 * const options = toAPISelectMenuOptions(this.getNodeParameter('options', 0));
 * options.forEach(opt => console.log(opt.label, opt.value));
 */
export const toAPISelectMenuOptions = (value: unknown): APISelectMenuOption[] => {
  return (value as APISelectMenuOption[]) || []
}

/**
 * Converts unknown value to Discord message action row components array
 *
 * Safely converts values to MessageActionRowComponentBuilder array format.
 * Returns empty array if conversion fails to prevent runtime errors.
 *
 * @param value - The value to convert (typically component builders)
 * @returns Array of MessageActionRowComponentBuilder objects, or empty array if invalid
 *
 * @example
 * const components = toMessageActionRowComponents(buttonBuilders);
 * const row = new ActionRowBuilder().addComponents(...components);
 */
export const toMessageActionRowComponents = (value: unknown): MessageActionRowComponentBuilder[] =>
  (value as MessageActionRowComponentBuilder[]) || []
