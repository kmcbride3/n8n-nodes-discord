/**
 * Unit Tests for Discord Interaction Operations
 *
 * Tests the interaction response operations:
 * - reply (initial response)
 * - deferReply (acknowledge with thinking state)
 * - editReply (update deferred response)
 * - followUp (send additional messages)
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Mock n8n-workflow's updateDisplayOptions before importing operations
jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	updateDisplayOptions: jest.fn((options) => options.properties || []),
}));

import * as replyOperation from '../../../../src/nodes/Discord/v2/actions/interaction/reply.operation';
import * as deferReplyOperation from '../../../../src/nodes/Discord/v2/actions/interaction/deferReply.operation';
import * as editReplyOperation from '../../../../src/nodes/Discord/v2/actions/interaction/editReply.operation';
import * as followUpOperation from '../../../../src/nodes/Discord/v2/actions/interaction/followUp.operation';
import { createMockExecuteFunctions } from '../../../helpers/executeFunctionsMock';

describe('Discord Interaction Operations', () => {
	let mockContext: IExecuteFunctions;
	let mockHttpRequest: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		mockHttpRequest = jest.fn().mockResolvedValue({ id: 'response_123' });

		mockContext = createMockExecuteFunctions({
			getInputData: jest.fn(() => [
				{
					json: {
						token: 'test_interaction_token',
						interactionId: 'interaction_123',
					},
				},
			]),
			getCredentials: jest.fn().mockResolvedValue({
				botToken: 'dGVzdA==.test.token123', // base64 encoded 'test'
			}),
			getNodeParameter: jest.fn((param: string, itemIndex: number, defaultValue?: any) => {
				if (param === 'interactionToken') return 'test_interaction_token';
				if (param === 'content') return 'Test response message';
				if (param === 'options') return {};
				return defaultValue;
			}) as IExecuteFunctions['getNodeParameter'],
			continueOnFail: jest.fn(() => false) as IExecuteFunctions['continueOnFail'],
			helpers: {
				httpRequest: mockHttpRequest,
			} as unknown as IExecuteFunctions['helpers'],
		});
	});

	describe('Reply Operation', () => {
		test('should send initial reply successfully', async () => {
			const result = await replyOperation.execute.call(mockContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				success: true,
				interactionToken: 'test_interaction_token',
				content: 'Test response message',
				ephemeral: false,
			});

			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: expect.stringContaining('/interactions/test_interaction_token/callback'),
				headers: expect.objectContaining({
					Authorization: expect.stringContaining('Bot'),
				}),
				body: {
					type: 4,
					data: expect.objectContaining({
						content: 'Test response message',
					}),
				},
				json: true,
			});
		});

		test('should send ephemeral reply', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionToken') return 'test_interaction_token';
				if (param === 'content') return 'Secret message';
				if (param === 'options') return { ephemeral: true };
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			await replyOperation.execute.call(mockContext);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						data: expect.objectContaining({
							flags: 64, // Ephemeral flag
						}),
					}),
				}),
			);
		});

		test('should send TTS reply', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionToken') return 'test_interaction_token';
				if (param === 'content') return 'TTS message';
				if (param === 'options') return { tts: true };
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			await replyOperation.execute.call(mockContext);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						data: expect.objectContaining({
							tts: true,
						}),
					}),
				}),
			);
		});

		test('should throw error when interaction token is missing', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionToken') return '';
				if (param === 'content') return 'Test message';
				if (param === 'options') return {};
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			await expect(replyOperation.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
		});

		test('should handle multiple items', async () => {
			mockContext.getInputData = jest.fn(() => [
				{ json: { token: 'token1' } },
				{ json: { token: 'token2' } },
				{ json: { token: 'token3' } },
			]);

			mockContext.getNodeParameter = jest.fn((param: string, itemIndex: number) => {
				if (param === 'interactionToken') return `token${itemIndex + 1}`;
				if (param === 'content') return `Message ${itemIndex + 1}`;
				if (param === 'options') return {};
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			const result = await replyOperation.execute.call(mockContext);

			expect(result[0]).toHaveLength(3);
			expect(mockHttpRequest).toHaveBeenCalledTimes(3);
		});
	});

	describe('Defer Reply Operation', () => {
		test('should defer reply successfully', async () => {
			const result = await deferReplyOperation.execute.call(mockContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				success: true,
				deferred: true,
				interactionToken: 'test_interaction_token',
				ephemeral: false,
			});

			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: expect.stringContaining('/interactions/test_interaction_token/callback'),
				headers: expect.objectContaining({
					Authorization: expect.stringContaining('Bot'),
				}),
				body: {
					type: 5, // DeferredChannelMessageWithSource
					data: {},
				},
				json: true,
			});
		});

		test('should defer ephemeral reply', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionToken') return 'test_interaction_token';
				if (param === 'options') return { ephemeral: true };
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			await deferReplyOperation.execute.call(mockContext);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						data: expect.objectContaining({
							flags: 64,
						}),
					}),
				}),
			);
		});
	});

	describe('Edit Reply Operation', () => {
		test('should edit deferred reply successfully', async () => {
			const result = await editReplyOperation.execute.call(mockContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				success: true,
				edited: true,
				interactionToken: 'test_interaction_token',
				content: 'Test response message',
			});

			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'PATCH',
				url: expect.stringMatching(/\/webhooks\/.+\/messages\/@original/),
				headers: expect.objectContaining({
					Authorization: expect.stringContaining('Bot'),
				}),
				body: {
					content: 'Test response message',
				},
				json: true,
			});
		});

		test('should use correct webhook endpoint format', async () => {
			await editReplyOperation.execute.call(mockContext);

			const callArgs = mockHttpRequest.mock.calls[0][0];
			expect(callArgs.url).toMatch(/\/webhooks\/[^/]+\/test_interaction_token\/messages\/@original/);
		});
	});

	describe('Follow Up Operation', () => {
		test('should send follow-up message successfully', async () => {
			const result = await followUpOperation.execute.call(mockContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				success: true,
				followUp: true,
				interactionToken: 'test_interaction_token',
				content: 'Test response message',
				ephemeral: false,
			});

			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: expect.stringMatching(/\/webhooks\/.+\/test_interaction_token/),
				headers: expect.objectContaining({
					Authorization: expect.stringContaining('Bot'),
				}),
				body: expect.objectContaining({
					content: 'Test response message',
				}),
				json: true,
			});
		});

		test('should send ephemeral follow-up', async () => {
			mockContext.getNodeParameter = jest.fn((param: string) => {
				if (param === 'interactionToken') return 'test_interaction_token';
				if (param === 'content') return 'Follow-up message';
				if (param === 'options') return { ephemeral: true };
				return '';
			}) as unknown as IExecuteFunctions['getNodeParameter'];

			await followUpOperation.execute.call(mockContext);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						flags: 64,
					}),
				}),
			);
		});
	});

	describe('Error Handling', () => {
		test('should handle network errors gracefully with continueOnFail', async () => {
			mockHttpRequest.mockRejectedValue(new Error('Network error'));
			mockContext.continueOnFail = jest.fn(() => true);

			const result = await replyOperation.execute.call(mockContext);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
			expect(result[0][0].json.error).toContain('Network error');
		});

		test('should throw error when continueOnFail is false', async () => {
			mockHttpRequest.mockRejectedValue(new Error('API error'));
			mockContext.continueOnFail = jest.fn(() => false);

			await expect(replyOperation.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
		});

		test('should include pairedItem in error responses', async () => {
			mockHttpRequest.mockRejectedValue(new Error('Test error'));
			mockContext.continueOnFail = jest.fn(() => true);

			const result = await replyOperation.execute.call(mockContext);

			expect(result[0][0]).toHaveProperty('pairedItem');
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});
	});

	describe('Properties Validation', () => {
		test('reply operation should have correct properties', () => {
			expect(replyOperation.properties).toBeDefined();
			expect(Array.isArray(replyOperation.properties)).toBe(true);
		});

		test('deferReply operation should have correct properties', () => {
			expect(deferReplyOperation.properties).toBeDefined();
			expect(Array.isArray(deferReplyOperation.properties)).toBe(true);
		});

		test('editReply operation should have correct properties', () => {
			expect(editReplyOperation.properties).toBeDefined();
			expect(Array.isArray(editReplyOperation.properties)).toBe(true);
		});

		test('followUp operation should have correct properties', () => {
			expect(followUpOperation.properties).toBeDefined();
			expect(Array.isArray(followUpOperation.properties)).toBe(true);
		});
	});
});
