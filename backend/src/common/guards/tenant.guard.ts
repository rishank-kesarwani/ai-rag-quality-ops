import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId =
      request.headers['x-tenant-id'] ||
      request.headers['tenant-id'] ||
      request.query?.tenantId ||
      process.env.DEFAULT_TENANT_ID ||
      'tenant-default';

    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new BadRequestException('A valid tenant identifier is required');
    }

    // Attach sanitized tenantId to request object
    request.tenantId = tenantId.trim();
    return true;
  }
}
