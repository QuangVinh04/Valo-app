import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../config/prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

const groupDetailSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  groupPermissions: {
    select: {
      permissionKey: true,
    },
  },
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
  _count: {
    select: {
      userGroups: true,
    },
  },
} satisfies Prisma.GroupSelect;

const groupIdSelect = {
  id: true,
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
  permissionKeys?: readonly string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  permissionKeys?: readonly string[];
}

export class GroupRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async findById(id: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupIdSelect,
    });
  }

  async findDetailById(id: string): Promise<GroupDetail | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupDetailSelect,
    });
  }

  async findMembersById(id: string): Promise<GroupMembers | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: groupMembersSelect,
    });
  }

  async findByName(name: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findFirst({
      where: { name },
      select: groupIdSelect,
    });
  }

  async findByNameExceptId(name: string, id: string): Promise<GroupIdentity | null> {
    return this.prisma.group.findFirst({
      where: {
        name,
        NOT: { id },
      },
      select: groupIdSelect,
    });
  }

  async findMany(input: { skip: number; take: number }): Promise<GroupListItem[]> {
    return this.prisma.group.findMany({
      skip: input.skip,
      take: input.take,
      select: groupListSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  count() {
    return this.prisma.group.count();
  }

  countUsers(groupId: string) {
    return this.prisma.userGroup.count({
      where: { groupId },
    });
  }

  async createGroup(input: CreateGroupInput): Promise<GroupIdentity> {
    return this.prisma.group.create({
      data: {
        name: input.name,
        description: input.description,
        groupPermissions: {
          create: (input.permissionKeys ?? []).map((permissionKey) => ({
            permissionKey,
          })),
        },
      },
      select: groupIdSelect,
    });
  }

  async updateGroup(
    id: string,
    input: Pick<UpdateGroupInput, 'name' | 'description'>
  ): Promise<void> {
    await this.prisma.group.update({
      where: { id },
      data: input,
    });
  }

  async deleteGroup(id: string): Promise<void> {
    await this.prisma.group.delete({
      where: { id },
    });
  }

  async deletePermissions(groupId: string) {
    return this.prisma.groupPermission.deleteMany({
      where: { groupId },
    });
  }

  async createPermissions(groupId: string, permissionKeys: readonly string[]) {
    return this.prisma.groupPermission.createMany({
      data: permissionKeys.map((permissionKey) => ({
        groupId,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  async findExistingIdsByIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];

    const groups = await this.prisma.group.findMany({
      where: {
        id: {
          in: [...ids],
        },
      },
      select: groupIdSelect,
    });

    return groups.map((group) => group.id);
  }

  async addMembers(groupId: string, userIds: readonly string[]) {
    return this.prisma.userGroup.createMany({
      data: userIds.map((userId) => ({
        groupId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  async removeMembers(groupId: string, userIds: readonly string[]) {
    return this.prisma.userGroup.deleteMany({
      where: {
        groupId,
        userId: {
          in: [...userIds],
        },
      },
    });
  }
}

const prismaService = PrismaService.getInstance();
export const groupRepository = new GroupRepository(prismaService.client);
