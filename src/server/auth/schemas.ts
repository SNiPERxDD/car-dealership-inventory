import { z } from 'zod';

export const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z
      .string()
      .min(8)
      .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
        message: 'Password must be at most 72 UTF-8 bytes',
      }),
  })
  .strict();

export type Credentials = z.infer<typeof credentialsSchema>;
