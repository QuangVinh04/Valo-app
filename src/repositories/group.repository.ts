import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

const groupInclude = {
  groupPermissions: true,
  userGroups: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.GroupInclude;

export type GroupFull = Prisma.GroupGetPayload<{
  include: typeof groupInclude;
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

  async findById(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
    });
  }

  async findByIdWithPermissions(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: groupInclude,
    });
  }

  async findByName(name: string) {
    return this.prisma.group.findFirst({
      where: { name },
    });
  }

  async findByNameExceptId(name: string, id: string) {
    return this.prisma.group.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });
  }

  async findMany(input: { skip: number; take: number }) {
    return this.prisma.group.findMany({
      skip: input.skip,
      take: input.take,
      include: groupInclude,
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

  async createGroup(input: CreateGroupInput) {
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
      include: groupInclude,
    });
  }

  async updateGroup(id: string, input: {
    name?: string;
    description?: string;
  }) {
    return this.prisma.group.update({
      where: { id },
      data: input,
      include: groupInclude,
    });
  }

  async deleteGroup(id: string) {
    return this.prisma.group.delete({
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

  async findExistingIdsByIds(ids: string[]): Promise<string[]> {
  const groups = this.prisma.group.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
    },
  });
  return groups.then((results) => results.map((group) => group.id));
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
