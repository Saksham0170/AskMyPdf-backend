import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        schema.parse({
          body: req.body,
          params: req.params,
          query: req.query,
        });
        next();
      } catch (err: any) {
        res.status(400).json({
          message: "Validation failed",
          errors: err.errors,
        });
      }
    };
