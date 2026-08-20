const { z } = require('zod');

// Equivalent of dto/request/RegisterRequest.java / LoginRequest.java

// 72 = bcrypt's input limit (bytes beyond it are silently ignored) - capping
// here keeps the "your password is N chars" story honest end to end.
const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be between 2 and 80 characters')
    .max(80, 'Name must be between 2 and 80 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('A valid email is required')
    .max(254, 'Email is too long'),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('A valid email is required'),
  // Intentionally not re-validated for strength on login - only whether it's
  // present. A weak/old password predating this rule must still be able to log in.
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(72),
});

module.exports = { registerSchema, loginSchema };
