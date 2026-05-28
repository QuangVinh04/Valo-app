export interface PermissionDefinition {
  readonly key: string;
  readonly description: string;
}

export class PermissionConstant {
  static readonly USER_READ: PermissionDefinition = {
    key: 'USER_R',
    description: 'View user information'
  };

  static readonly USER_CREATE: PermissionDefinition = {
    key: 'USER_C',
    description: 'Create new users'
  };

  static readonly USER_UPDATE: PermissionDefinition = {
    key: 'USER_U',
    description: 'Update user information'
  };

  static readonly USER_DELETE: PermissionDefinition = {
    key: 'USER_D',
    description: 'Delete users'
  };

  static readonly CHAT: PermissionDefinition = {
    key: 'CHAT',
    description: 'Access chat features'
  };

  static readonly CONV_CREATE: PermissionDefinition = {
    key: 'CONV_C',
    description: 'Create conversations'
  };
  
  static readonly CONV_READ: PermissionDefinition = {
    key: 'CONV_R',
    description: 'View conversations'
  };

  static readonly CONV_UPDATE: PermissionDefinition = {
    key: 'CONV_U',
    description: 'Update conversations'
  };
  
  static readonly CONV_DELETE: PermissionDefinition = {
    key: 'CONV_D',
    description: 'Delete conversations'
  };

  static readonly GROUP_READ: PermissionDefinition = {
    key: 'GROUP_R',
    description: 'View group information'
  };

  static readonly GROUP_CREATE: PermissionDefinition = {
    key: 'GROUP_C',
    description: 'Create new groups'
  };

  static readonly GROUP_UPDATE: PermissionDefinition = {
    key: 'GROUP_U',
    description: 'Update group information'
  };

  static readonly GROUP_DELETE: PermissionDefinition = {
    key: 'GROUP_D',
    description: 'Delete groups'
  };

  static readonly GROUP_ADD_USER: PermissionDefinition = {
    key: 'GROUP_ADD_USER',
    description: 'Add users to groups'
  };
  
  static readonly GROUP_DELETE_USER: PermissionDefinition = {
    key: 'GROUP_DELETE_USER',
    description: 'Delete users from groups'
  };

  static readonly ALL: readonly PermissionDefinition[] = [
    PermissionConstant.USER_READ,
    PermissionConstant.USER_CREATE,
    PermissionConstant.USER_UPDATE,
    PermissionConstant.USER_DELETE,
    PermissionConstant.GROUP_READ,
    PermissionConstant.GROUP_CREATE,
    PermissionConstant.GROUP_UPDATE,
    PermissionConstant.GROUP_DELETE,
    PermissionConstant.CHAT,
    PermissionConstant.CONV_CREATE,
    PermissionConstant.CONV_READ,
    PermissionConstant.CONV_UPDATE,
    PermissionConstant.CONV_DELETE,
    PermissionConstant.GROUP_ADD_USER,
    PermissionConstant.GROUP_DELETE_USER
  ] as const;
}

export type PermissionKey = (typeof PermissionConstant.ALL)[number]['key'];
