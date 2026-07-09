import type { Group, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

const groupDetailSelect = {
  id: true,
  name: true,
  description: true,
  permissions: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      userGroups: true,
    },
  },
} satisfies Prisma.GroupSelect;

const groupMembersSelect = {
  id: true,
  name: true,
  userGroups: {
    select: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.GroupSelect;

const groupListSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  _count: {
    select: {
      userGroups: true,
    },
  },
} satisfies Prisma.GroupSelect;

const groupIdSelect = {
  id: true,
  name: true,
  isSystem: true
} satisfies Prisma.GroupSelect;

export type GroupDetail = Prisma.GroupGetPayload<{
  select: typeof groupDetailSelect;
}>;

export type GroupMembers = Prisma.GroupGetPayload<{
  select: typeof groupMembersSelect;
}>;

export type GroupListItem = Prisma.GroupGetPayload<{
  select: typeof groupListSelect;
}>;

export type GroupIdentity = Prisma.GroupGetPayload<{
  select: typeof groupIdSelect;
}>;

export interface CreateGroupInput {
  name: string;
  description?: string;
  permissions?: readonly string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  permissions?: readonly string[];
}

export interface GroupFindManyInput {
  skip: number;
  take: number;
  search?: string;
}

export interface GroupMembersFindInput {
  skip: number;
  take: number;
  search?: string;
}

export class GroupRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async findById(id: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupIdSelect
    });
  }

  async findDetailById(id: string): Promise<GroupDetail | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupDetailSelect
    });
  }

  async findMembersById(id: string): Promise<GroupMembers | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupMembersSelect
    });
  }

  async findMembersPageById(
    id: string,
    input: GroupMembersFindInput
  ): Promise<GroupMembers | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        userGroups: {
          skip: input.skip,
          take: input.take,
          where: this.buildGroupMemberWhere(input),
          orderBy: {
            user: {
              fullName: 'asc'
            }
          },
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async findByName(name: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findFirst({
      where: { name },
      select: groupIdSelect
    });
  }

  async findByNameExceptId(name: string, id: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findFirst({
      where: {
        name,
        NOT: { id }
      },
      select: groupIdSelect
    });
  }

  private buildGroupWhere(input: Pick<GroupFindManyInput, 'search'>): Prisma.GroupWhereInput {
    return {
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
  }

  async findMany(input: GroupFindManyInput): Promise<GroupListItem[]> {
    return this.prisma.group.findMany({
      skip: input.skip,
      take: input.take,
      where: this.buildGroupWhere(input),
      select: groupListSelect,
      orderBy: { createdAt: 'desc' }
    });
  }

  count(input: Pick<GroupFindManyInput, 'search'> = {}) {
    return this.prisma.group.count({
      where: this.buildGroupWhere(input)
    });
  }

  countUsers(groupId: string) {
    return this.prisma.userGroup.count({
      where: { groupId }
    });
  }

  countMembers(groupId: string, input: Pick<GroupMembersFindInput, 'search'> = {}) {
    return this.prisma.userGroup.count({
      where: {
        groupId,
        ...this.buildGroupMemberWhere(input)
      }
    });
  }

  private buildGroupMemberWhere(
    input: Pick<GroupMembersFindInput, 'search'>
  ): Prisma.UserGroupWhereInput {
    return {
      ...(input.search
        ? {
            user: {
              OR: [
                { fullName: { contains: input.search, mode: 'insensitive' } },
                { email: { contains: input.search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    };
  }

  async createGroup(input: CreateGroupInput): Promise<GroupIdentity> {
    return this.prisma.group.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: [...(input.permissions ?? [])],
        isSystem: false
      },
      select: groupIdSelect
    });
  }

  async createSystemGroup(input: CreateGroupInput): Promise<GroupIdentity> {
    return this.prisma.group.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: [...(input.permissions ?? [])],
        isSystem: true
      },
      select: groupIdSelect
    });
  }

  async updateGroup(id: string, input: UpdateGroupInput): Promise<Group> {
    return this.prisma.group.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        ...(input.permissions !== undefined ? { permissions: [...input.permissions] } : {})
      }
    });
  }

  async deleteGroup(id: string): Promise<void> {
    await this.prisma.group.delete({
      where: { id }
    });
  }

  async deleteManyByIds(ids: readonly string[]): Promise<number> {
    if (!ids.length) return 0;

    const result = await this.prisma.group.deleteMany({
      where: {
        id: {
          in: [...ids]
        }
      }
    });

    return result.count;
  }

  async findManyByIds(ids: readonly string[]): Promise<GroupIdentity[]> {
    if (ids.length === 0) return [];

    return this.prisma.group.findMany({
      where: {
        id: {
          in: [...ids]
        }
      },
      select: groupIdSelect
    });
  }

  async addMembers(groupId: string, userIds: readonly string[]) {
    return this.prisma.userGroup.createMany({
      data: userIds.map((userId) => ({
        groupId,
        userId
      })),
      skipDuplicates: true
    });
  }

  async removeMembers(groupId: string, userIds: readonly string[]) {
    return this.prisma.userGroup.deleteMany({
      where: {
        groupId,
        userId: {
          in: [...userIds]
        }
      }
    });
  }
}

const prismaService = PrismaService.getInstance();
export const groupRepository = new GroupRepository(prismaService.client);
