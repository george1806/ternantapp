import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator to mark routes as public (skip JWT auth)
 * Author: george1806
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
