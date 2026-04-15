import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map(err => ({
        field: err.path.slice(1).join('.'), // Remove 'body'/'query' prefix
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    // Merge validated data into existing request objects where possible to
    // avoid replacing properties that may be non-writable in some runtimes.
    const validated = result.data as any;
    if (validated.body && typeof req.body === 'object') {
      Object.assign(req.body, validated.body);
    }
    if (validated.query && typeof req.query === 'object') {
      Object.assign(req.query, validated.query);
    }
    if (validated.params && typeof req.params === 'object') {
      Object.assign(req.params, validated.params);
    }

    next();
  };
}
