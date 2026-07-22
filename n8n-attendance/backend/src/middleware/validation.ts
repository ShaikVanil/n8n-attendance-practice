import { validationResult, FieldValidationError, ValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => {
      if ('path' in error) {
        return { message: error.msg, field: error.path };
      } else {
        return { message: error.msg };
      }
    });
    return res.status(400).json({ errors: formattedErrors });
  }
  next();
};