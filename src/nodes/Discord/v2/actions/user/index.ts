/**
 * User Resource Index
 * Exports all user operations
 */

import * as getUserOp from './getUser.operation'

export const getUser = { execute: getUserOp.execute, properties: getUserOp.properties }
