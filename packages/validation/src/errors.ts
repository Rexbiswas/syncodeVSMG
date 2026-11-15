import { z } from 'zod';

/**
 * Format Zod validation errors into a clean, human-readable list
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((issue) => {
      const path = issue.path.join('.');
      return `[${path || 'root'}]: ${issue.message}`;
    })
    .join('; ');
}

/**
 * Validates environment variables against a Zod schema
 */
export function validateEnv<Output, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = unknown>(
  schema: z.ZodType<Output, Def, Input>,
  env: Record<string, unknown>,
): Output {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw new Error(`Environment validation failed: ${formatted}`);
  }
  return result.data;
}

