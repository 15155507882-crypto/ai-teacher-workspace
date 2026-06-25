import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/shared';

export const OWNER_CHECK_KEY = 'ownerCheck';

/**
 * 所有权守卫: 教师只能操作自己的资源，管理员可操作所有
 * 配合 @OwnerResource() 装饰器指定 request 中的 teacher_id 来源
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ownerCheck = this.reflector.get<{ param?: string; body?: string }>(
      OWNER_CHECK_KEY,
      context.getHandler()
    );
    if (!ownerCheck) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('未登录');

    // 管理员跳过所有权检查
    if (user.role === Role.ADMIN) return true;

    // 获取目标资源的 teacher_id
    const targetTeacherId = ownerCheck.param
      ? parseInt(request.params[ownerCheck.param], 10)
      : ownerCheck.body
        ? request.body[ownerCheck.body]
        : null;

    if (!targetTeacherId) return true;

    if (user.teacherId !== targetTeacherId) {
      throw new ForbiddenException('您无权操作他人的资料');
    }

    return true;
  }
}
