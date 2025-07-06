import { Request, Response, NextFunction } from 'express';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error messages en français
const ERROR_MESSAGES = {
  SEFARIA_DOWN: "Impossible de récupérer les textes. Réessayez plus tard.",
  GEMINI_LIMIT: "Limite de traduction atteinte. Patientez quelques secondes.",
  TTS_FAILED: "Synthèse vocale indisponible. Vérifiez votre connexion.",
  DATABASE_ERROR: "Erreur de base de données. Veuillez réessayer.",
  VALIDATION_ERROR: "Données invalides. Vérifiez votre requête.",
  NOT_FOUND: "Ressource non trouvée.",
  UNAUTHORIZED: "Accès non autorisé.",
  SERVER_ERROR: "Erreur serveur. Nous travaillons à résoudre le problème."
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Global error handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = ERROR_MESSAGES.SERVER_ERROR;
  let details: any = undefined;

  // Handle known errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = ERROR_MESSAGES.VALIDATION_ERROR;
    details = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = ERROR_MESSAGES.NOT_FOUND;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  });
};