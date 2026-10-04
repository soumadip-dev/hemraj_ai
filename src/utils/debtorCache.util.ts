import { redisClient } from '../config/redis.config';

export function createDebtorCacheKey(query: object): string {
  const queryString = JSON.stringify(query);

  return `debtors:list:${queryString}`;
}

export async function getCachedDebtors(cacheKey: string): Promise<unknown | null> {
  const cachedData = await redisClient.get(cacheKey);

  if (!cachedData) {
    return null;
  }
  return JSON.parse(cachedData);
}

export async function cacheDebtors(cacheKey: string, debtors: unknown): Promise<void> {
  await redisClient.setEx(cacheKey, 60, JSON.stringify(debtors));
}
