/**
 * Unit Tests for Discord Interaction Trigger
 *
 * Tests the interaction trigger functionality including:
 * - Button interaction handling
 * - Select menu interaction handling
 * - Modal submission handling
 * - Slash command handling
 * - Custom ID pattern matching
 * - Filtering and transformation
 */

import type { ITriggerFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { interactionRouter } from '../../../../src/nodes/Discord/v2/triggers/interactionRouter';
import { INTERACTION_TRIGGER_REGISTRY } from '../../../../src/nodes/Discord/v2/triggers/interactionTriggerRegistry';

// Mock Discord.js
jest.mock('discord.js', () => {
	const mockClient = {
		login: jest.fn().mockResolvedValue('token'),
		isReady: jest.fn().mockReturnValue(true),
		destroy: jest.fn().mockResolvedValue(undefined),
		on: jest.fn(),
		off: jest.fn(),
		once: jest.fn((event: string, callback: () => void) => {
			if (event === 'ready') callback();
		}),
		options: {
			intents: new Set([1]), // Guilds intent
		},
	};

	return {
		Client: jest.fn(() => mockClient),
		GatewayIntentBits: {
			Guilds: 1,
		},
		IntentsBitField: jest.fn().mockImplementation(() => ({
			has: jest.fn().mockReturnValue(true),
		})),
	};
});

// Mock the helper functions
jest.mock('../../../../src/nodes/Discord/v2/triggerHelpers', () => ({
	getDiscordClient: jest.fn().mockResolvedValue({
		on: jest.fn(),
		off: jest.fn(),
		isReady: jest.fn().mockReturnValue(true),
	}),
	INTERACTION_TRIGGER_INTENT_REQUIREMENTS: {
		buttonInteraction: [1],
		selectMenuInteraction: [1],
		modalInteraction: [1],
		commandInteraction: [1],
	},
}));

describe('Discord Interaction Trigger', () => {
	let mockContext: ITriggerFunctions;

	beforeEach(() => {
		jest.clearAllMocks();

		mockContext = {
			getNode: jest.fn(() => ({
				id: 'test-interaction-node',
				name: 'Discord Interaction Test',
				type: '@kmcbride3/n8n-nodes-discord.discordInteraction',
				typeVersion: 2,
				position: [0, 0] as [number, number],
				parameters: {},
			})),
			getCredentials: jest.fn().mockResolvedValue({
				botToken: 'test.bot.token123456789',
			}),
			getNodeParameter: jest.fn((param: string) => {
				if (param === 'interactionType') return 'buttonInteraction';
				if (param === 'customIdPattern') return '';
				if (param === 'matchType') return 'exact';
				if (param === 'commandName') return '';
				if (param === 'options') return {};
				return undefined;
			}),
			emit: jest.fn(),
			emitError: jest.fn(),
			getWorkflow: jest.fn(() => ({
				id: 'test-workflow',
				name: 'Test Workflow',
				active: true,
			})),
		} as unknown as ITriggerFunctions;
	});

	describe('Interaction Trigger Registry', () => {
		test('should define all 4 interaction types', () => {
			const expectedTypes = [
				'buttonInteraction',
				'selectMenuInteraction',
				'modalInteraction',
				'commandInteraction',
			];

			expectedTypes.forEach((type) => {
				expect(INTERACTION_TRIGGER_REGISTRY[type as keyof typeof INTERACTION_TRIGGER_REGISTRY]).toBeDefined();
			});
		});

		test('all interaction triggers should have required properties', () => {
			Object.values(INTERACTION_TRIGGER_REGISTRY).forEach((config) => {
				expect(config).toHaveProperty('type');
				expect(config).toHaveProperty('discordEvent');
				expect(config).toHaveProperty('requiredIntents');
				expect(config).toHaveProperty('filter');
				expect(config).toHaveProperty('transform');
				expect(typeof config.filter).toBe('function');
				expect(typeof config.transform).toBe('function');
			});
		});

		test('all interaction triggers should listen to interactionCreate event', () => {
			Object.values(INTERACTION_TRIGGER_REGISTRY).forEach((config) => {
				expect(config.discordEvent).toBe('interactionCreate');
			});
		});
	});

	describe('Button Interaction Filtering', () => {
		test('should filter button by exact customId match', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'approve_request_123',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'approve_request_123';
				if (param === 'matchType') return 'exact';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should reject button with non-matching customId', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'reject_request_456',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'approve_request_123';
				if (param === 'matchType') return 'exact';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(false);
		});

		test('should filter button by startsWith pattern', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'approve_request_123',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'approve_';
				if (param === 'matchType') return 'startsWith';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should filter button by contains pattern', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'approve_request_123',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'request';
				if (param === 'matchType') return 'contains';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should filter button by regex pattern', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'approve_request_123',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return '^approve_.*_\\d+$';
				if (param === 'matchType') return 'regex';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should handle invalid regex gracefully', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'approve_request_123',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return '[invalid(regex';
				if (param === 'matchType') return 'regex';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(false);
		});

		test('should accept all buttons when no pattern specified', async () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				customId: 'any_button_id',
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return '';
				return '';
			});

			const result = await buttonConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});
	});

	describe('Select Menu Interaction Filtering', () => {
		test('should filter select menu by exact customId', async () => {
			const selectConfig = INTERACTION_TRIGGER_REGISTRY.selectMenuInteraction;
			const mockInteraction = {
				isAnySelectMenu: () => true,
				customId: 'role_select',
				values: ['role1', 'role2'],
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'role_select';
				if (param === 'matchType') return 'exact';
				return '';
			});

			const result = await selectConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should reject non-select-menu interactions', async () => {
			const selectConfig = INTERACTION_TRIGGER_REGISTRY.selectMenuInteraction;
			const mockInteraction = {
				isAnySelectMenu: () => false,
				customId: 'button_id',
				user: { id: '123', bot: false },
			} as any;

			const result = await selectConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(false);
		});
	});

	describe('Modal Interaction Filtering', () => {
		test('should filter modal by exact customId', async () => {
			const modalConfig = INTERACTION_TRIGGER_REGISTRY.modalInteraction;
			const mockInteraction = {
				isModalSubmit: () => true,
				customId: 'feedback_form',
				fields: {
					fields: new Map([
						['feedback', { customId: 'feedback', value: 'Great work!' }],
					]),
				},
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'customIdPattern') return 'feedback_form';
				if (param === 'matchType') return 'exact';
				return '';
			});

			const result = await modalConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should reject non-modal interactions', async () => {
			const modalConfig = INTERACTION_TRIGGER_REGISTRY.modalInteraction;
			const mockInteraction = {
				isModalSubmit: () => false,
				customId: 'button_id',
				user: { id: '123', bot: false },
			} as any;

			const result = await modalConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(false);
		});
	});

	describe('Command Interaction Filtering', () => {
		test('should filter command by name', async () => {
			const commandConfig = INTERACTION_TRIGGER_REGISTRY.commandInteraction;
			const mockInteraction = {
				isChatInputCommand: () => true,
				commandName: 'help',
				commandId: '123456789',
				options: { data: [] },
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'commandName') return 'help';
				return '';
			});

			const result = await commandConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});

		test('should reject command with different name', async () => {
			const commandConfig = INTERACTION_TRIGGER_REGISTRY.commandInteraction;
			const mockInteraction = {
				isChatInputCommand: () => true,
				commandName: 'stats',
				commandId: '123456789',
				options: { data: [] },
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'commandName') return 'help';
				return '';
			});

			const result = await commandConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(false);
		});

		test('should accept all commands when no name specified', async () => {
			const commandConfig = INTERACTION_TRIGGER_REGISTRY.commandInteraction;
			const mockInteraction = {
				isChatInputCommand: () => true,
				commandName: 'any_command',
				commandId: '123456789',
				options: { data: [] },
				user: { id: '123', bot: false },
			} as any;

			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'commandName') return '';
				return '';
			});

			const result = await commandConfig.filter(mockInteraction, mockContext);
			expect(result).toBe(true);
		});
	});

	describe('Interaction Data Transformation', () => {
		test('should transform button interaction data', () => {
			const buttonConfig = INTERACTION_TRIGGER_REGISTRY.buttonInteraction;
			const mockInteraction = {
				isButton: () => true,
				id: 'interaction_123',
				customId: 'approve_btn',
				user: {
					id: '456',
					username: 'testuser',
					discriminator: '0001',
					avatar: 'avatar_hash',
					bot: false,
				},
				member: {
					user: { id: '456' },
					nickname: 'Test User',
					roles: { cache: [{ id: 'role1' }, { id: 'role2' }] },
				},
				channel: { id: '789', type: 0 },
				guild: { id: '101112', name: 'Test Guild' },
				message: {
					id: 'msg_123',
					content: 'Original message',
					channelId: '789',
				},
				token: 'interaction_token',
				createdTimestamp: 1234567890,
			} as any;

			const result = buttonConfig.transform(mockInteraction);

			expect(result).toMatchObject({
				interactionId: 'interaction_123',
				interactionType: 'button',
				customId: 'approve_btn',
				user: {
					id: '456',
					username: 'testuser',
					bot: false,
				},
				token: 'interaction_token',
			});
		});

		test('should transform select menu interaction with values', () => {
			const selectConfig = INTERACTION_TRIGGER_REGISTRY.selectMenuInteraction;
			const mockInteraction = {
				isAnySelectMenu: () => true,
				id: 'interaction_456',
				customId: 'role_select',
				values: ['role1', 'role2', 'role3'],
				user: {
					id: '789',
					username: 'selectuser',
					discriminator: '0002',
					avatar: null,
					bot: false,
				},
				member: null,
				channel: { id: '111', type: 0 },
				guild: { id: '222', name: 'Select Guild' },
				message: null,
				token: 'select_token',
				createdTimestamp: 9876543210,
			} as any;

			const result = selectConfig.transform(mockInteraction);

			expect(result).toMatchObject({
				interactionId: 'interaction_456',
				interactionType: 'selectMenu',
				customId: 'role_select',
				values: ['role1', 'role2', 'role3'],
				user: {
					id: '789',
					username: 'selectuser',
				},
			});
		});

		test('should transform modal interaction with fields', () => {
			const modalConfig = INTERACTION_TRIGGER_REGISTRY.modalInteraction;
			const fieldMap = new Map();
			fieldMap.set('field1', { customId: 'field1', value: 'Value 1' });
			fieldMap.set('field2', { customId: 'field2', value: 'Value 2' });

			const mockInteraction = {
				isModalSubmit: () => true,
				id: 'interaction_789',
				customId: 'feedback_modal',
				fields: {
					fields: fieldMap,
				},
				user: {
					id: '999',
					username: 'modaluser',
					discriminator: '0003',
					avatar: 'modal_avatar',
					bot: false,
				},
				member: null,
				channel: { id: '333', type: 0 },
				guild: { id: '444', name: 'Modal Guild' },
				token: 'modal_token',
				createdTimestamp: 1111111111,
			} as any;

			const result = modalConfig.transform(mockInteraction);

			expect(result).toMatchObject({
				interactionId: 'interaction_789',
				interactionType: 'modal',
				customId: 'feedback_modal',
				fields: {
					field1: 'Value 1',
					field2: 'Value 2',
				},
			});
		});

		test('should transform command interaction with options', () => {
			const commandConfig = INTERACTION_TRIGGER_REGISTRY.commandInteraction;
			const mockInteraction = {
				isChatInputCommand: () => true,
				id: 'interaction_cmd',
				commandName: 'stats',
				commandId: 'cmd_123',
				options: {
					data: [
						{ name: 'user', value: '123456' },
						{ name: 'period', value: '7d' },
					],
				},
				user: {
					id: '555',
					username: 'cmduser',
					discriminator: '0004',
					avatar: null,
					bot: false,
				},
				member: null,
				channel: { id: '666', type: 0 },
				guild: { id: '777', name: 'Command Guild' },
				token: 'cmd_token',
				createdTimestamp: 2222222222,
			} as any;

			const result = commandConfig.transform(mockInteraction);

			expect(result).toMatchObject({
				interactionId: 'interaction_cmd',
				interactionType: 'command',
				commandName: 'stats',
				commandId: 'cmd_123',
				options: {
					user: '123456',
					period: '7d',
				},
			});
		});
	});

	describe('Interaction Router', () => {
		test('should throw error for unknown interaction type', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionType') return 'unknownType';
				return undefined;
			});

			await expect(interactionRouter.call(mockContext)).rejects.toThrow(NodeOperationError);
		});

		test('should set up event listener for button interactions', async () => {
			const mockClient = {
				on: jest.fn(),
				off: jest.fn(),
				isReady: jest.fn().mockReturnValue(true),
			};

			const { getDiscordClient } = require('../../../../src/nodes/Discord/v2/triggerHelpers');
			(getDiscordClient as jest.Mock).mockResolvedValue(mockClient);

			const result = await interactionRouter.call(mockContext);

			expect(result).toBeDefined();
			expect(result?.closeFunction).toBeDefined();
			expect(mockClient.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
		});

		test('should clean up event listener on close', async () => {
			const mockClient = {
				on: jest.fn(),
				off: jest.fn(),
				isReady: jest.fn().mockReturnValue(true),
			};

			const { getDiscordClient } = require('../../../../src/nodes/Discord/v2/triggerHelpers');
			(getDiscordClient as jest.Mock).mockResolvedValue(mockClient);

			const result = await interactionRouter.call(mockContext);

			expect(result?.closeFunction).toBeDefined();

			if (result?.closeFunction) {
				await result.closeFunction();
				expect(mockClient.off).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
			}
		});
	});
});
