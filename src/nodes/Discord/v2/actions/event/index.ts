/**
 * Event Resource Index
 * Exports all event operations
 */

import * as getEventOp from './getEvent.operation'
import * as getEventUsersOp from './getEventUsers.operation'
import * as listEventsOp from './listEvents.operation'

export const getEvent = { execute: getEventOp.execute, properties: getEventOp.properties }
export const getEventUsers = { execute: getEventUsersOp.execute, properties: getEventUsersOp.properties }
export const listEvents = { execute: listEventsOp.execute, properties: listEventsOp.properties }
