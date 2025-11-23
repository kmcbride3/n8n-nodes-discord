/**
 * Role Resource Index
 * Exports all role operations
 */

import * as getRoleOp from './getRole.operation'
import * as getRoleMembersOp from './getRoleMembers.operation'
import * as getRolePermissionsOp from './getRolePermissions.operation'
import * as listRolesOp from './listRoles.operation'

export const getRole = { execute: getRoleOp.execute, properties: getRoleOp.properties }
export const getRoleMembers = { execute: getRoleMembersOp.execute, properties: getRoleMembersOp.properties }
export const getRolePermissions = { execute: getRolePermissionsOp.execute, properties: getRolePermissionsOp.properties }
export const listRoles = { execute: listRolesOp.execute, properties: listRolesOp.properties }
