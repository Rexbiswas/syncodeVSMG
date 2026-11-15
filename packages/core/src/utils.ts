import { performance } from 'perf_hooks';

/**
 * Measures the execution time of an asynchronous function in milliseconds.
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { result, durationMs };
}

/**
 * Executes a function safely and catches errors, returning standard error or result
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

