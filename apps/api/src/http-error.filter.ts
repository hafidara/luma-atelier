import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    let error = "Unable to complete the request. Please try again.";
    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : (body as { message?: string | string[] }).message;
      error = Array.isArray(message)
        ? message.join(" ")
        : message || exception.message;
    } else {
      this.logger.error(exception);
    }
    response.status(status).json({ error });
  }
}
