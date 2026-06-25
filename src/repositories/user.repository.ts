import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';
import type { User } from '@prisma/client';



type DbClient = PrismaClient | Prisma.TransactionClient;

const userGroupsSelect = {
  userGroups: {
    select: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const userDetailSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  address: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
  ...userGroupsSelect,
} satisfies Prisma.UserSelect;

const userListSelect = {
  id: true,
  fullName: true,
  email: true,
  ...userGroupsSelect,
} satisfies Prisma.UserSelect;

export type UserDetail = Prisma.UserGetPayload<{
  select: typeof userDetailSelect;
}>;

export type UserListItem = Prisma.UserGetPayload<{
  select: typeof userListSelect;
}>;

export interface CreateUserInput {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  password: string;
  mustChangePassword?: boolean;
}

export interface UpdateUserInput {
  fullName?: string;
  phoneNumber?: string | null;
  address?: string | null;
}

export interface UserSettingsInput {
  theme: 'dark' | 'light';
  language: 'vi' | 'en';
}

export interface UserFindManyInput {
  skip: number;
  take: number;
  search?: string;
  groupId?: string;
  mustChangePassword?: boolean;
}

export class UserRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }


  async findDetailById(id: string): Promise<UserDetail | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userDetailSelect,
    });
  }


  async findPermissionKeysByUserId(id: string): Promise<string[] | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        userGroups: {
          select: {
            group: {
              select: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return [
      ...new Set(
        user.userGroups.flatMap((userGroup) =>
          userGroup.group.permissions
        )
      ),
    ];
  }


  private buildUserWhere(input: Pick<UserFindManyInput, 'search' | 'groupId' | 'mustChangePassword'>): Prisma.UserWhereInput {
    return {
      ...(input.search ? {
        OR: [
          { fullName: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(input.groupId ? {
        userGroups: {
          some: {
            groupId: input.groupId,
          },
        },
      } : {}),
      ...(input.mustChangePassword !== undefined ? {
        mustChangePassword: input.mustChangePassword,
      } : {}),
    };
  }


  async findMany(input: UserFindManyInput): Promise<UserListItem[]> {
    return this.prisma.user.findMany({
      skip: input.skip,
      take: input.take,
      where: this.buildUserWhere(input),
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
    });
  }


  async count(input: Pick<UserFindManyInput, 'search' | 'groupId' | 'mustChangePassword'> = {}): Promise<number> {
    return this.prisma.user.count({
      where: this.buildUserWhere(input),
    });
  }


  async findExistingIdsByIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: [...ids]
        }
      },
      select: { id: true }
    });

    return users.map((user) => user.id);
  }


  async createUser(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        address: input.address,
        password: input.password,
        mustChangePassword: input.mustChangePassword ?? true,
      },
    });
  }


  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: input,
    });
  }

  async assignGroups(userId: string, groupIds: readonly string[]): Promise<void> {
    await this.prisma.userGroup.createMany({
      data: groupIds.map((groupId) => ({
        userId,
        groupId,
      })),
      skipDuplicates: true,
    });
  }

  async updateSettings(id: string, settings: UserSettingsInput): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { settings: settings as unknown as Prisma.InputJsonObject },
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async updatePassword(input: { userId: string; password: string }): Promise<void> {
    await this.prisma.user.update({
      where: { id: input.userId },
      data: {
        password: input.password,
        mustChangePassword: false
      },
    });
  }

  async saveRefreshToken(input: { userId: string; refreshToken: string | null }): Promise<void> {
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { refreshToken: input.refreshToken },
    });
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }
}

const prismaService = PrismaService.getInstance();
export const userRepository = new UserRepository(prismaService.client);
