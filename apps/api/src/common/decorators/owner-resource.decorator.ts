import { SetMetadata } from '@nestjs/common';

export const OWNER_CHECK_KEY = 'ownerCheck';

/**
 * 标记需要所有权校验
 * @param config param: request.params 中的字段; body: request.body 中的字段
 */
export const OwnerResource = (config: { param?: string; body?: string }) =>
  SetMetadata(OWNER_CHECK_KEY, config);
