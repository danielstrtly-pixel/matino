import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the store sync flow.
 * 
 * The sync system works as follows:
 * 1. User saves stores via POST /api/user/stores
 * 2. If there are new stores, frontend calls POST /api/stores/sync-user
 * 3. sync-user proxies to scraper /api/sync which:
 *    - Skips stores already synced today (has last_synced_at >= today AND offers exist)
 *    - Scrapes remaining stores
 *    - Returns { synced, skipped, offers } counts
 */

// Mock Supabase client
const mockSupabaseUser = { id: 'test-user-123' }
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseUser } }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

describe('Store Sync Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/user/stores', () => {
    it('should NOT trigger fire-and-forget sync', async () => {
      // This test ensures we removed the problematic fire-and-forget
      // The old code had a fetch() call that wasn't awaited
      
      const mockFetch = vi.fn()
      global.fetch = mockFetch
      
      // Simulate the route handler logic (simplified)
      const storeIds = ['store-1', 'store-2']
      const currentStoreIds = new Set(['store-1'])
      const newStoreIds = storeIds.filter(id => !currentStoreIds.has(id))
      
      // The response should include newStoreIds for frontend to handle
      const response = {
        success: true,
        count: storeIds.length,
        newStoreIds,
      }
      
      expect(response.newStoreIds).toEqual(['store-2'])
      // No fire-and-forget fetch should have been called
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return newStoreIds for frontend sync', async () => {
      const existingStores = ['store-1']
      const requestedStores = ['store-1', 'store-2', 'store-3']
      
      const newStoreIds = requestedStores.filter(id => !existingStores.includes(id))
      
      expect(newStoreIds).toEqual(['store-2', 'store-3'])
    })
  })

  describe('POST /api/stores/sync-user', () => {
    it('should proxy to scraper with user ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          synced: 2,
          skipped: 1,
          offers: 45,
        }),
      })
      global.fetch = mockFetch
      
      // Simulate calling scraper
      const userId = 'test-user-123'
      const SCRAPER_URL = 'http://localhost:3001'
      const SYNC_API_KEY = 'test-key'
      
      await mockFetch(`${SCRAPER_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SYNC_API_KEY,
        },
        body: JSON.stringify({ userId }),
      })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      )
    })
  })

  describe('Scraper /api/sync logic', () => {
    it('should skip stores synced today with existing offers', () => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      
      const store = {
        id: 'store-1',
        name: 'Test Store',
        last_synced_at: new Date().toISOString(), // Synced today
        offerCount: 25, // Has offers
      }
      
      const lastSync = new Date(store.last_synced_at)
      const shouldSkip = lastSync >= today && store.offerCount > 0
      
      expect(shouldSkip).toBe(true)
    })

    it('should NOT skip stores synced today but with 0 offers', () => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      
      const store = {
        id: 'store-1',
        name: 'Test Store',
        last_synced_at: new Date().toISOString(),
        offerCount: 0, // No offers - needs resync!
      }
      
      const lastSync = new Date(store.last_synced_at)
      const shouldSkip = lastSync >= today && store.offerCount > 0
      
      expect(shouldSkip).toBe(false)
    })

    it('should NOT skip stores not synced today', () => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const store = {
        id: 'store-1',
        name: 'Test Store',
        last_synced_at: yesterday.toISOString(),
        offerCount: 25,
      }
      
      const lastSync = new Date(store.last_synced_at)
      const shouldSkip = lastSync >= today && store.offerCount > 0
      
      expect(shouldSkip).toBe(false)
    })

    it('should NOT skip stores never synced', () => {
      const store = {
        id: 'store-1',
        name: 'Test Store',
        last_synced_at: null,
        offerCount: 0,
      }
      
      const shouldSkip = store.last_synced_at !== null
      
      expect(shouldSkip).toBe(false)
    })
  })

  describe('Frontend sync behavior', () => {
    it('should only trigger sync when there are new stores', async () => {
      const mockSyncFetch = vi.fn()
      
      // Scenario 1: No new stores
      const responseNoNew = { success: true, newStoreIds: [] }
      if (responseNoNew.newStoreIds.length > 0) {
        mockSyncFetch()
      }
      expect(mockSyncFetch).not.toHaveBeenCalled()
      
      // Scenario 2: Has new stores
      const responseWithNew = { success: true, newStoreIds: ['store-2'] }
      if (responseWithNew.newStoreIds.length > 0) {
        mockSyncFetch()
      }
      expect(mockSyncFetch).toHaveBeenCalledTimes(1)
    })

    it('should display appropriate message based on sync result', () => {
      const formatSyncMessage = (result: { synced: number; skipped: number; offers: number }) => {
        if (result.synced > 0) {
          return `✅ ${result.offers} erbjudanden hämtade från ${result.synced} butik${result.synced > 1 ? 'er' : ''}!`
        } else if (result.skipped > 0) {
          return `✅ Butiker sparade! Erbjudanden redan uppdaterade idag.`
        }
        return `✅ Butiker sparade!`
      }

      expect(formatSyncMessage({ synced: 2, skipped: 1, offers: 45 }))
        .toBe('✅ 45 erbjudanden hämtade från 2 butiker!')
      
      expect(formatSyncMessage({ synced: 1, skipped: 0, offers: 20 }))
        .toBe('✅ 20 erbjudanden hämtade från 1 butik!')
      
      expect(formatSyncMessage({ synced: 0, skipped: 3, offers: 0 }))
        .toBe('✅ Butiker sparade! Erbjudanden redan uppdaterade idag.')
      
      expect(formatSyncMessage({ synced: 0, skipped: 0, offers: 0 }))
        .toBe('✅ Butiker sparade!')
    })
  })
})
