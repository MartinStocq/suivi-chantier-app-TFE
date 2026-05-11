import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GET } from '@/app/api/meteo/sync/route'
import { syncChantiersMeteo } from '@/lib/meteo'

vi.mock('@/lib/meteo', () => ({
  syncChantiersMeteo: vi.fn().mockResolvedValue({ updated: 1, errors: 0 }),
}))

describe('API Meteo Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
    process.env.CRON_SECRET = 'secret123'
  })

  it('should sync meteo data in development/test mode even without key', async () => {
    // In the route, it says:
    // if (process.env.NODE_ENV !== 'production' || (process.env.CRON_SECRET && key === process.env.CRON_SECRET))
    
    const req = new Request('http://localhost/api/meteo/sync')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(syncChantiersMeteo).toHaveBeenCalled()
  })

  it('should return 401 in production without correct key', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const req = new Request('http://localhost/api/meteo/sync?key=wrong')
    const response = await GET(req)
    
    expect(response.status).toBe(401)
    
    process.env.NODE_ENV = originalEnv
  })

  it('should return 200 in production with correct key', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const req = new Request('http://localhost/api/meteo/sync?key=secret123')
    const response = await GET(req)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    process.env.NODE_ENV = originalEnv
  })
})
