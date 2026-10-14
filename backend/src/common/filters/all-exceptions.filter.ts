import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      uuidv4();

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: any = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as Record<string, any>;
      message = resObj.message || message;
      errors =
        resObj.errors ||
        (Array.isArray(resObj.message) ? resObj.message : null);
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error && status < 500) {
      message = exception.message;
    }

    // Never log client errors (4xx) as server errors.
    // Never leak stack traces, credentials, or internal details in public responses.
    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} Status: ${status} - Error: ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} Status: ${status} - Client Notice: ${JSON.stringify(message)}`,
      );
    }

    // Set correlation ID in header for response tracing
    response.setHeader('x-correlation-id', correlationId);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: status >= 500 ? 'An unexpected server error occurred' : message,
      errors: status >= 500 ? null : errors,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
