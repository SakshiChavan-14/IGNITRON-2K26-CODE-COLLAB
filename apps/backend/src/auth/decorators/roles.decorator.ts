import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@ignitron/shared';

export const ROLES_KEY = 'roles';
export type AllowedRole = 'ADMIN' | 'TEAM' | AdminRole;

export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_KEY, roles);
