import { BASE_AUTH_PATH, BASE_CONVERSATION_PATH, BASE_GROUP_PATH, BASE_USER_PATH } from '../routes.js';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Valo API',
    version: '1.0.0',
    description: 'API documentation for Valo backend',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Groups',
      description: 'Group and permission endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Conversations',
      description: 'Conversation management endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          error: {
            type: 'object',
            nullable: true,
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalItems: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', example: 'Nguyen Van A' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'TemporaryPassword123!' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'TemporaryPassword123!' },
          newPassword: { type: 'string', example: 'NewPassword123!' },
          confirmPassword: { type: 'string', example: 'NewPassword123!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string', example: 'Nguyen Van A' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          groups: {
            type: 'array',
            items: { $ref: '#/components/schemas/AuthGroup' },
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['CHAT', 'CONV_R'],
          },
          mustChangePassword: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          accessToken: { type: 'string', nullable: true },
        },
      },
      AuthGroup: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'user' },
          description: { type: 'string', nullable: true, example: 'Default users' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['CHAT', 'CONV_C', 'CONV_R'],
          },
        },
      },
      GroupRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'moderator' },
          description: { type: 'string', example: 'Moderators' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['GROUP_R', 'USER_R'],
          },
        },
      },
      UpdateGroupRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'moderator' },
          description: { type: 'string', example: 'Moderators' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['GROUP_R', 'USER_R'],
          },
        },
      },
      GroupResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'moderator' },
          description: { type: 'string', nullable: true, example: 'Moderators' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['GROUP_R', 'USER_R'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserGroupLite: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'user' },
          description: { type: 'string', nullable: true, example: 'Default users' },
        },
      },
      UserRequest: {
        type: 'object',
        required: ['fullName', 'email'],
        properties: {
          fullName: { type: 'string', example: 'Nguyen Van B' },
          email: { type: 'string', format: 'email', example: 'b@example.com' },
          phoneNumber: { type: 'string', nullable: true, example: '+84901234567' },
          address: { type: 'string', nullable: true, example: 'Ho Chi Minh City' },
          groupIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Nguyen Van B Updated' },
          phoneNumber: { type: 'string', nullable: true, example: '+84901234567' },
          address: { type: 'string', nullable: true, example: 'Ho Chi Minh City' },
          groupIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string', example: 'Nguyen Van B' },
          email: { type: 'string', format: 'email', example: 'b@example.com' },
          phoneNumber: { type: 'string', nullable: true, example: '+84901234567' },
          address: { type: 'string', nullable: true, example: 'Ho Chi Minh City' },
          groups: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserGroupLite' },
          },
          mustChangePassword: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ConversationMessageResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string', example: 'Xin chao' },
          senderType: { type: 'string', enum: ['user', 'assistant', 'system'] },
          modelName: { type: 'string', nullable: true, example: 'llama-3.3-70b-versatile' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateConversationRequest: {
        type: 'object',
        required: ['title', 'modelName'],
        properties: {
          title: { type: 'string', example: 'New conversation' },
          modelName: { type: 'string', example: 'llama-3.3-70b-versatile' },
        },
      },
      UpdateConversationRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Updated title' },
          modelName: { type: 'string', example: 'llama-3.1-8b-instant' },
        },
      },
      ConversationResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'New conversation' },
          modelName: { type: 'string', example: 'llama-3.3-70b-versatile' },
          userId: { type: 'string', format: 'uuid' },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/ConversationMessageResponse' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiGroupResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Group found' },
          data: { $ref: '#/components/schemas/GroupResponse' },
        },
      },
      ApiGroupListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Groups found' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/GroupResponse' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      ApiAuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: { $ref: '#/components/schemas/AuthResponse' },
        },
      },
      ApiNullResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Password changed successfully' },
          data: { nullable: true, example: null },
        },
      },
      ApiUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'User found' },
          data: { $ref: '#/components/schemas/UserResponse' },
        },
      },
      ApiUserListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Users found' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserResponse' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      ApiConversationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Conversation found' },
          data: { $ref: '#/components/schemas/ConversationResponse' },
        },
      },
      ApiConversationListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Conversations found' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ConversationResponse' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
    },
  },
  paths: {
    [`${BASE_AUTH_PATH}/register`]: {
      post: {
        tags: ['Auth'],
        summary: 'Register a user and email a temporary password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiAuthResponse' },
              },
            },
          },
          '400': { description: 'Validation failed' },
          '409': { description: 'Email already in use' },
        },
      },
    },
    [`${BASE_AUTH_PATH}/login`]: {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in successfully',
            headers: {
              'Set-Cookie': {
                description: 'HttpOnly refresh token cookie',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiAuthResponse' },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    [`${BASE_AUTH_PATH}/logout`]: {
      post: {
        tags: ['Auth'],
        summary: 'Logout and revoke refresh token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiNullResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    [`${BASE_AUTH_PATH}/refresh-token`]: {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token using refresh token cookie',
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiAuthResponse' },
              },
            },
          },
          '401': { description: 'Invalid refresh token' },
        },
      },
    },
    [`${BASE_AUTH_PATH}/change-password`]: {
      post: {
        tags: ['Auth'],
        summary: 'Change current user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiNullResponse' },
              },
            },
          },
          '400': { description: 'Invalid password input' },
          '401': { description: 'Unauthorized or invalid current password' },
        },
      },
    },
    [BASE_GROUP_PATH]: {
      get: {
        tags: ['Groups'],
        summary: 'List groups',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Groups found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiGroupListResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Groups'],
        summary: 'Create a group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GroupRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Group created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiGroupResponse' },
              },
            },
          },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Group name already in use' },
        },
      },
    },
    [`${BASE_GROUP_PATH}/{id}`]: {
      get: {
        tags: ['Groups'],
        summary: 'Get group by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Group found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiGroupResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Group not found' },
        },
      },
      put: {
        tags: ['Groups'],
        summary: 'Update group',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateGroupRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Group updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiGroupResponse' },
              },
            },
          },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Group not found' },
          '409': { description: 'Group name already in use' },
        },
      },
      delete: {
        tags: ['Groups'],
        summary: 'Delete group',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Group deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiNullResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Group not found' },
        },
      },
    },
    [BASE_USER_PATH]: {
      get: {
        tags: ['Users'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Users found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiUserListResponse' } } },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserRequest' } } },
        },
        responses: {
          '201': {
            description: 'User created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiUserResponse' } } },
          },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Conflict' },
        },
      },
    },
    [`${BASE_USER_PATH}/{id}`]: {
      get: {
        tags: ['Users'],
        summary: 'Get user by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'User found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiUserResponse' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'User not found' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } },
        },
        responses: {
          '200': { description: 'User updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiUserResponse' } } } },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'User not found' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'User deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiNullResponse' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'User not found' },
        },
      },
    },
    [BASE_CONVERSATION_PATH]: {
      get: {
        tags: ['Conversations'],
        summary: 'List conversations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': { description: 'Conversations found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiConversationListResponse' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Conversations'],
        summary: 'Create conversation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConversationRequest' } } },
        },
        responses: {
          '201': { description: 'Conversation created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiConversationResponse' } } } },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    [`${BASE_CONVERSATION_PATH}/{id}`]: {
      get: {
        tags: ['Conversations'],
        summary: 'Get conversation by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Conversation found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiConversationResponse' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Conversation not found' },
        },
      },
      put: {
        tags: ['Conversations'],
        summary: 'Update conversation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateConversationRequest' } } },
        },
        responses: {
          '200': { description: 'Conversation updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiConversationResponse' } } } },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Conversation not found' },
        },
      },
      delete: {
        tags: ['Conversations'],
        summary: 'Delete conversation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Conversation deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiNullResponse' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Conversation not found' },
        },
      },
    },
  },
};
