import type { AllEntities } from 'n8n-workflow'

import { addRole, banUser, kickUser, removeRole, timeoutUser } from './actions/member'
import { bulkDeleteMessages, deleteMessage, sendMessage } from './actions/message'
import { sendButton, sendSelect } from './actions/prompt'
import { interactionManager, utility } from './actions/utility'
import { createWebhook, sendWebhook } from './actions/webhook'

/**
 * NodeMap type definition for all Discord V2 operations
 * Provides type safety for operation routing and execution
 * Structure: resource -> operation -> execute function
 */
export type NodeMap = {
  message: {
    send: typeof sendMessage.execute
    deleteMessage: typeof deleteMessage.execute
    removeMessages: typeof bulkDeleteMessages.execute
  }
  prompt: {
    button: typeof sendButton.execute
    select: typeof sendSelect.execute
  }
  action: {
    addRole: typeof addRole.execute
    removeRole: typeof removeRole.execute
    kickMember: typeof kickUser.execute
    banMember: typeof banUser.execute
    timeoutMember: typeof timeoutUser.execute
  }
  webhook: {
    create: typeof createWebhook.execute
    send: typeof sendWebhook.execute
  }
  utility: {
    utility: typeof utility.execute
    interactionManager: typeof interactionManager.execute
  }
}

/**
 * AllEntities type for the Discord V2 node
 * Ensures type safety across all node operations
 */
export type DiscordV2NodeEntities = AllEntities<NodeMap>
