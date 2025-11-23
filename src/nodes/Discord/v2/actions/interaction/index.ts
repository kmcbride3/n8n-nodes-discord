/**
 * Interaction operations index
 * Exports all interaction response operations
 */

import type { INodeProperties } from 'n8n-workflow'

import { execute as deferReplyExecute, properties as deferReplyProperties } from './deferReply.operation'
import { execute as editReplyExecute, properties as editReplyProperties } from './editReply.operation'
import { execute as followUpExecute, properties as followUpProperties } from './followUp.operation'
import { execute as replyExecute, properties as replyProperties } from './reply.operation'

export const deferReply = { execute: deferReplyExecute, properties: deferReplyProperties }
export const editReply = { execute: editReplyExecute, properties: editReplyProperties }
export const followUp = { execute: followUpExecute, properties: followUpProperties }
export const reply = { execute: replyExecute, properties: replyProperties }

export const description: INodeProperties[] = []
