import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantHeader =
      request.headers['x-tenant-id'] ||
      request.headers['tenant-id'] ||
      request.query?.tenantId;

    if (typeof tenantHeader === 'string' && tenantHeader.trim()) {
      return tenantHeader.trim();
    }

    return process.env.DEFAULT_TENANT_ID || 'tenant-default';
  },
);
