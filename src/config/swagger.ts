import { BASE_AUTH_PATH, BASE_GROUP_PATH } from '../routes.js';

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
  },
};
