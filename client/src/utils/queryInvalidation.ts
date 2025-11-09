import { QueryClient } from '@tanstack/react-query';

/**
 * ✅ Global query invalidation utility
 * Call this after ANY game-state-changing action to refresh ALL caches instantly
 * 
 * This ensures:
 * - Upgrades update level-up requirements in real-time
 * - Level-ups update profile and menus instantly
 * - Tasks/Achievements sync across all views
 * - No need to refresh page to see updated data
 */
export async function invalidateAllGameQueries(queryClient: QueryClient) {
  console.log('🔄 [QUERY INVALIDATION] Invalidating all game queries...');
  
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/api/player/me'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/upgrades'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/levels'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/achievements'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/characters'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/media'] }),
  ]);
  
  console.log('✅ [QUERY INVALIDATION] All queries invalidated - UI will refresh');
}

/**
 * ✅ Invalidate only player-related queries (lighter weight)
 */
export async function invalidatePlayerQueries(queryClient: QueryClient) {
  console.log('🔄 [QUERY INVALIDATION] Invalidating player queries...');
  
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/api/player/me'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] }),
  ]);
  
  console.log('✅ [QUERY INVALIDATION] Player queries invalidated');
}

/**
 * ✅ Invalidate task/achievement queries after claim
 */
export async function invalidateTaskAchievementQueries(queryClient: QueryClient) {
  console.log('🔄 [QUERY INVALIDATION] Invalidating task/achievement queries...');
  
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/achievements'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/player/me'] }),
  ]);
  
  console.log('✅ [QUERY INVALIDATION] Task/achievement queries invalidated');
}
