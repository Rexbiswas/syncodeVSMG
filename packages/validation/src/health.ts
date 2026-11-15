import { z } from 'zod';

export const serviceStatusSchema = z.enum(['up', 'down']);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const overallHealthStatusSchema = z.enum(['ok', 'degraded', 'down']);
export type OverallHealthStatus = z.infer<typeof overallHealthStatusSchema>;

export const serviceDetailSchema = z.object({
  status: serviceStatusSchema,
  latencyMs: z.number().optional(),
  message: z.string().optional(),
});
export type ServiceDetail = z.infer<typeof serviceDetailSchema>;

export const healthResponseSchema = z.object({
  status: overallHealthStatusSchema,
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
  services: z.object({
    api: serviceDetailSchema,
    database: serviceDetailSchema,
    redis: serviceDetailSchema,
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

