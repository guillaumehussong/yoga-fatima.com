import {
  adminWhitelistRouter,
  courseModelRouter,
  courseRegistrationRouter,
  courseRouter,
  emailMessageRouter,
  userRouter
} from './routers';
import { selfRouter } from './routers/self';
import { publicRouter } from './routers/public';
import { router } from './trpc';
import { transactionRouter } from './routers/transaction';

export const appRouter =
  router({
    adminWhitelist: adminWhitelistRouter,
    course: courseRouter,
    courseModel: courseModelRouter,
    courseRegistration: courseRegistrationRouter,
    emailMessage: emailMessageRouter,
    public: publicRouter,
    self: selfRouter,
    user: userRouter,
    transaction: transactionRouter,
  });

export type AppRouter = typeof appRouter;
