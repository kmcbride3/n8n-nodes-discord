import { Client, GuildMemberRoleManager, Interaction, MessageFlags, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state, { IPromptData, ITrigger } from '../state'

/**
 * Processes channel-based triggers for interactions
 */
async function processChannelTriggers(interaction: Interaction, userRoles: string[], client: Client): Promise<boolean> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false

  for (const [key, channelTriggers] of Object.entries(state.channels)) {
    for (const trigger of channelTriggers) {
      if (trigger.type !== 'interaction' || trigger.interactionMessageId !== interaction.message.id) continue

      if (!(await checkTriggerRolePermissions(interaction, trigger, userRoles, client))) return true

      await executeTriggerWorkflow(interaction, trigger, key, client, userRoles)
      return true
    }
  }

  return false
}

/**
 * Checks if the user has the required roles for the trigger
 */
async function checkTriggerRolePermissions(
  interaction: Interaction,
  trigger: ITrigger,
  userRoles: string[],
  client: Client,
): Promise<boolean> {
  if (!trigger.roleIds?.length) return true

  const hasRole = trigger.roleIds.some((role) => userRoles.includes(role))
  if (hasRole) return true

  if (interaction.isRepliable()) {
    await interaction
      .reply({
        content: 'You are not allowed to do this',
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: Error) => addLog(e.message, client))
  }

  return false
}

/**
 * Executes the workflow associated with a trigger
 */
async function executeTriggerWorkflow(
  interaction: Interaction,
  trigger: ITrigger,
  channelKey: string,
  client: Client,
  userRoles: string[],
): Promise<void> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return

  addLog(`triggerWorkflow ${trigger.webhookId}`, client)
  const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''
  const interactionValues = interaction.isButton() ? [interaction.customId] : interaction.values

  let isEnabled = false
  try {
    const result = await triggerWorkflow(
      trigger.webhookId,
      null,
      placeholderMatchingId,
      state.baseUrl,
      interaction.user,
      interaction.channelId,
      undefined,
      undefined,
      undefined,
      undefined,
      interaction.message.id,
      interactionValues,
      userRoles,
    )
    isEnabled = Boolean(result)
  } catch (e) {
    addLog(e instanceof Error ? e.message : String(e), client)
  }

  await interaction.deferUpdate().catch((e: Error) => addLog(e.message, client))

  if (isEnabled && trigger.placeholder) {
    await handlePlaceholder(client, channelKey, trigger.placeholder, placeholderMatchingId)
  }
}

/**
 * Handles placeholder messages
 */
async function handlePlaceholder(
  client: Client,
  channelKey: string,
  placeholderContent: string,
  placeholderMatchingId: string,
): Promise<void> {
  const channel = client.channels.cache.get(channelKey)
  if (!channel?.isTextBased()) return

  const placeholder = await (channel as TextChannel).send(placeholderContent).catch((e: Error) => {
    addLog(e.message, client)
    return null
  })

  if (placeholder) {
    await placeholderLoading(placeholder, placeholderMatchingId, placeholderContent)
  }
}

/**
 * Checks if the user has permission to interact with the prompt
 */
async function checkPromptPermissions(
  interaction: Interaction,
  promptData: IPromptData,
  userRoles: string[],
  client: Client,
): Promise<boolean> {
  if (!interaction.isRepliable()) return false

  // Check role permissions
  if (promptData.restrictToRoles && Array.isArray(promptData.mentionRoles)) {
    const hasRole = promptData.mentionRoles.some((role) => userRoles.includes(role))
    if (!hasRole) {
      await interaction
        .reply({
          content: 'You are not allowed to do this',
          flags: MessageFlags.Ephemeral,
        })
        .catch((e: Error) => addLog(e.message, client))
      return false
    }
  }

  // Check user restrictions
  const triggeringUserId = state.executionMatching.get(promptData.executionId)?.userId
  if (promptData.restrictToTriggeringUser && triggeringUserId && interaction.user.id !== triggeringUserId) {
    await interaction
      .reply({
        content: 'You are not allowed to do this',
        flags: MessageFlags.Ephemeral,
      })
      .catch((e: Error) => addLog(e.message, client))
    return false
  }

  return true
}

/**
 * Processes user interaction with prompts
 */
async function processPromptInteraction(
  interaction: Interaction,
  promptData: IPromptData,
  client: Client,
): Promise<void> {
  if ((!interaction.isButton() && !interaction.isStringSelectMenu()) || !interaction.channel) return
  if (promptData.value) return // Already processed

  const buttonOrSelect = getSelectedOption(interaction, promptData)
  if (!buttonOrSelect?.label) return

  addLog(`User interact: ${buttonOrSelect.label}`, client)

  // Update prompt data with user's selection
  updatePromptDataWithSelection(promptData, interaction)

  // Update UI to reflect selection
  await updatePromptUI(interaction, promptData, buttonOrSelect.label, client)
}

/**
 * Gets the selected button or menu option
 */
function getSelectedOption(interaction: Interaction, promptData: IPromptData) {
  if (interaction.isButton() && promptData.buttons?.button) {
    return promptData.buttons.button.find((b) => b.value === interaction.customId)
  }

  if (interaction.isStringSelectMenu() && promptData.select?.select) {
    return promptData.select.select.find((b) => b.value === interaction.values[0])
  }

  return undefined
}

/**
 * Updates prompt data with the user's selection
 */
function updatePromptDataWithSelection(promptData: IPromptData, interaction: Interaction): void {
  promptData.value = interaction.isButton()
    ? interaction.customId
    : interaction.isStringSelectMenu()
      ? interaction.values[0]
      : null

  promptData.userId = interaction.user.id
  promptData.userName = interaction.user.username
  promptData.userTag = interaction.user.tag

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    promptData.channelId = interaction.message.channelId
    promptData.messageId = interaction.message.id
  }
}

/**
 * Updates the UI after a prompt interaction
 */
async function updatePromptUI(
  interaction: Interaction,
  promptData: IPromptData,
  selectedLabel: string,
  client: Client,
): Promise<void> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return

  // Remove components from message
  await interaction.update({ components: [] }).catch((e: Error) => addLog(e.message, client))

  // Send confirmation message
  const channel = interaction.channel
  if (!channel?.isTextBased()) return

  await (channel as TextChannel)
    .send(`<@${interaction.user.id}>: ${selectedLabel}`)
    .catch((e: Error) => addLog(e.message, client))

  // Update original message after a delay
  setTimeout(async () => {
    try {
      const message = await (channel as TextChannel).messages.fetch(interaction.message.id)
      await message
        .edit({
          content: promptData.content,
          components: [],
        })
        .catch((e: Error) => addLog(e.message, client))
    } catch (e) {
      addLog(`Failed to fetch message: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  }, 1000)
}

export default function (client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return

      const userRoles = (interaction.member?.roles as GuildMemberRoleManager)?.cache.map((role) => role.id) || []

      // Process channel triggers first
      const triggerProcessed = await processChannelTriggers(interaction, userRoles, client)
      if (triggerProcessed) return

      // If no trigger matched, check for prompt data
      const promptData = state.promptData[interaction.message.id] as IPromptData | undefined
      if (!promptData) return

      // Check if user has permission to interact with the prompt
      const hasPermission = await checkPromptPermissions(interaction, promptData, userRoles, client)
      if (!hasPermission) return

      // Process the user's interaction with the prompt
      await processPromptInteraction(interaction, promptData, client)
    } catch (e) {
      addLog(`Error in interactionCreateUI: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
