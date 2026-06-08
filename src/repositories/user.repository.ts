import type { Prisma, PrismaClient, User } from '@prisma/client';


type DbClient = PrismaClient | Prisma.TransactionClient;
const userInclude = {
  userGroups: {
    include: {
      group: {
        include: {
          groupPermissions: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserFull = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

export interface CreateUserInput {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  password: string;
  mustChangePassword?: boolean;
  groupIds: readonly string[];
}

export interface UpdateUserInput {
  fullName?: string;
  phoneNumber?: string | null;
  address?: string | null;
  groupIds?: readonly string[];
}

export interface UserSettingsInput {
  theme: 'dark' | 'light';
  language: 'vi' | 'en';
}

export interface UserProfileInput {
  phoneNumber?: string | null;
  address?: string | null;
}


export class UserRepository {
  private readonly prisma: DbClient;

  constructor(prismaClient: DbClient) {
    this.prisma = prismaClient;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByEmailForAuth(email: string): Promise<UserFull | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdForAuth(id: string): Promise<UserFull | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
  }


  async findMany(input: { skip: number; take: number }): Promise<UserFull[]> {
    return this.prisma.user.findMany({
      skip: input.skip,
      take: input.take,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  }


  async count(): Promise<number> {
    return this.prisma.user.count();
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


  async createUser(input: CreateUserInput): Promise<UserFull> {
    return this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        address: input.address,
        password: input.password,
        mustChangePassword: input.mustChangePassword ?? true,
        userGroups: {
          create: input.groupIds.map((groupId) => ({ groupId })),
        },
      },
      include: userInclude,
    });
  }


  async updateUser(id: string, input: UpdateUserInput): Promise<UserFull> {
    const { groupIds, ...userData } = input;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...userData, 

        
        ...(groupIds && {
          userGroups: {
            deleteMany: {}, 
            create: groupIds.map((groupId) => ({ groupId })), 
          },
        }),
      },
      include: userInclude
    });
  }

  async updateSettings(id: string, settings: UserSettingsInput): Promise<UserFull> {
    return this.prisma.user.update({
      where: { id },
      data: { settings: settings as unknown as Prisma.InputJsonObject },
      include: userInclude
    });
  }

  async updateProfile(id: string, input: UserProfileInput): Promise<UserFull> {
    return this.prisma.user.update({
      where: { id },
      data: input,
      include: userInclude
    });
  }


  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async updatePassword(input: { userId: string; password: string }): Promise<void> {
    await this.prisma.user.update({
      where: { id: input.userId },
      data: {
        password: input.password,
        mustChangePassword: false
      }
    });
  }

  async saveRefreshToken(input: { userId: string; refreshToken: string | null }): Promise<void> {
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { refreshToken: input.refreshToken }
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

  async findRefreshTokenByUserId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.refreshToken || null;
  }
}

export default UserRepository;
