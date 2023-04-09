import { Prisma, User } from '@prisma/client';
import { prisma, writeTransaction } from '../prisma';
import {
  userCreateSchema,
  userDisableSchema,
  userSchemaBase,
  usersMergeSchema,
  userUpdateSchema,
  userUpdateSelfSchema
} from '../../common/schemas/user';
import { z } from 'zod';
import { isWhitelistedAdmin } from './adminWhitelist';
import { ServiceError, ServiceErrorCode } from './helpers/errors';

export const findUser = async <Where extends Prisma.UserWhereUniqueInput, Select extends Prisma.UserSelect, Include extends Prisma.UserInclude>(prisma: Prisma.TransactionClient, args: { where: Where, select?: Select, include?: Include }) =>
  prisma.user.findUniqueOrThrow(args);

export const findUsers = async <Where extends Prisma.UserWhereInput, Select extends Prisma.UserSelect, Include extends Prisma.UserInclude, OrderBy extends Prisma.Enumerable<Prisma.UserOrderByWithRelationInput>>(args: { where?: Where, select?: Select, include?: Include, orderBy?: OrderBy } = {}) =>
  prisma.user.findMany(args);

export const findUserUpdate = async <Where extends Prisma.UserWhereUniqueInput>(prisma: Prisma.TransactionClient, args: { where: Where }) => {
  const { id, name, email, customName, customEmail, managedByUserId } = await findUser(prisma, { where: args.where, select: { id: true, name: true, email: true, customName: true, customEmail: true, managedByUserId: true } });
  return { id, name: customName ?? name, email: customEmail ?? email, managedByUserId };
}

export const findManaged = async (args: { where: Prisma.UserWhereUniqueInput }) => {
  const { managedByUser, managedUsers } = await prisma.user.findUniqueOrThrow({ where: args.where, include: { managedByUser: true, managedUsers: true } });
  return { managedByUser, managedUsers };
};

export const validateControlsUser = async (prisma: Prisma.TransactionClient, args: { where: { id: number, userId: number } }) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: args.where.id }, select: { managedUsers: { select: { id: true } } } });
  if (!(args.where.id === args.where.userId || user.managedUsers.some(({ id }) => id === args.where.userId))) {
    throw new ServiceError(ServiceErrorCode.UserCannotControlUser);
  }
};

export const createUser = async <Select extends Prisma.UserSelect, Include extends Prisma.UserInclude>(prisma: Prisma.TransactionClient, args: { data: z.infer<typeof userCreateSchema>, select?: Select, include?: Include }) => {
  userCreateSchema.parse(args.data);
  // No need to validate the user manager in create, it is correct is all cases wrt to the current logic
  return prisma.user.create({ data: { customName: args.data.name, customEmail: args.data.email, managedByUserId: args.data.managedByUserId } });
}

export const updateUser = async <Where extends Prisma.UserWhereUniqueInput, Select extends Prisma.UserSelect>(args: { where: Where, data: z.infer<typeof userCreateSchema>, select?: Select }) => {
  userUpdateSchema.parse({ ...args.data, id: args.where.id });
  // Validate user manager
  if (args.where.id === args.data.managedByUserId) {
    throw new ServiceError(ServiceErrorCode.UserCannotManageThemselves);
  }
  return await writeTransaction(async (prisma) => {
    const user = await prisma.user.findUniqueOrThrow({ where: args.where, include: { managedUsers: true } });
    if (args.data.managedByUserId !== null && user.managedUsers.length > 0) {
      throw new ServiceError(ServiceErrorCode.UserAlreadyManages);
    }
    await updateUserInformation(prisma, { where: args.where, data: { name: args.data.name, email: args.data.email } });
    return prisma.user.update({ where: args.where, data: { managedByUserId: args.data.managedByUserId } });
  });
}

export const updateUserInformation = async <Where extends Prisma.UserWhereUniqueInput, Select extends Prisma.UserSelect>(prisma: Prisma.TransactionClient, args: { where: Where, data: z.infer<typeof userSchemaBase>, select?: Select }) => {
  userUpdateSelfSchema.parse({ ...args.data, id: args.where.id });
  const user = await prisma.user.findUniqueOrThrow({ where: args.where, include: { managedUsers: true } });
  const customName = args.data.name === user.name ? null : args.data.name;
  const customEmail = args.data.email === user.email ? null : args.data.email;
  return await prisma.user.update({ ...args, data: { customName, customEmail } });
}

export const updateUserDisable = async (args: { where: Prisma.UserWhereUniqueInput, data: Omit<z.infer<typeof userDisableSchema>, 'id'> }) => {
  userDisableSchema.parse({ ...args.where, ...args.data });
  await writeTransaction(async (prisma) => {
    if (args.data.disabled) {
      const user = await prisma.user.findUniqueOrThrow({ where: args.where, select: { email: true } });
      if (await isWhitelistedAdmin(prisma, user)) {
        throw new ServiceError(ServiceErrorCode.UserCannotBeDisabled);
      }
    }
    await prisma.user.update({ where: args.where, data: { disabled: args.data.disabled } });
  });
};

export const deleteUser = async (args: { where: Prisma.UserWhereUniqueInput }) => {
  await writeTransaction(async (prisma) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: args.where,
      include: {
        accounts: true,
        sessions: true,
        managedUsers: true,
        transactions: true,
        emailsReceived: true,
        courseRegistrations: true,
      },
    });
    const hasNonEmptyRelation = [user.accounts, user.sessions, user.managedUsers, user.transactions, user.emailsReceived, user.courseRegistrations].some(array => array.length > 0);
    if (hasNonEmptyRelation || user.managedByUserId !== null || user.emailVerified !== null) {
      throw new ServiceError(ServiceErrorCode.UserCannotBeDeleted);
    }
    return prisma.user.delete(args);
  });
};

export const mergeUsers = async (args: { data: z.infer<typeof usersMergeSchema> }) => writeTransaction(async prisma => {
  const include = {
      accounts: true,
      sessions: true,
      managedByUser: true,
      managedUsers: true,
      transactions: true,
      emailsReceived: true,
      courseRegistrations: true,
      coupons: true,
      memberships: { include: { users: true } },
      orders: true,
  };
  const [mainUser, secondaryUser] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { id: args.data.mainUserId }, include }), prisma.user.findUniqueOrThrow({ where: { id: args.data.secondaryUserId }, include })]);
  const mainUserId = mainUser.id;

  const mainUserCourses = new Set(mainUser.courseRegistrations.map(r => r.courseId)), secondaryUserCourses = new Set(secondaryUser.courseRegistrations.map(r => r.courseId));
  const allCourses = new Set();
  mainUserCourses.forEach(id => allCourses.add(id));
  secondaryUserCourses.forEach(id => allCourses.add(id));

  if (
    mainUserCourses.size + secondaryUserCourses.size !== allCourses.size ||
    secondaryUser.managedByUserId !== null ||
    secondaryUser.managedUsers.length > 0
  ) {
    throw new ServiceError(ServiceErrorCode.UsersCannotBeMerged);
  }

  await Promise.all([
    ...secondaryUser.accounts.map(({ id }) => prisma.account.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.sessions.map(({ id }) => prisma.session.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.transactions.map(({ id }) => prisma.transaction.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.emailsReceived.map(({ id }) => prisma.emailMessage.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.courseRegistrations.map(({ id }) => prisma.courseRegistration.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.coupons.map(({ id }) => prisma.coupon.update({ where: { id }, data: { userId: mainUserId } })),
    ...secondaryUser.memberships.map(({ id, users }) =>
      prisma.membership.update({
        where: { id },
        data: { users: { disconnect: { id }, connect: users.some(user => user.id === mainUserId) ? undefined : { id: mainUserId } } },
      })),
    ...secondaryUser.orders.map(({ id }) => prisma.order.update({ where: { id }, data: { userId: mainUserId } })),
  ]);

  let shouldDeleteUser = true;
  if (
    // Verified email takes precedence over non verified email, which takes precedence over no email
    secondaryUser.email !== null && mainUser.email === null
    || secondaryUser.emailVerified !== null && mainUser.emailVerified === null
  ) {
    await prisma.user.update({ where: { id: mainUserId }, data: { emailVerified: secondaryUser.emailVerified, email: secondaryUser.email } });
  } else if (mainUser.emailVerified !== null && secondaryUser.emailVerified !== null) {
    shouldDeleteUser = false;
  }
  if (shouldDeleteUser) {
    await prisma.user.delete({ where: { id: secondaryUser.id } });
  } else {
    await prisma.user.update({ where: { id: secondaryUser.id }, data: { disabled: true } });
  }

  return prisma.user.findUniqueOrThrow({ where: { id: mainUserId } });
});
