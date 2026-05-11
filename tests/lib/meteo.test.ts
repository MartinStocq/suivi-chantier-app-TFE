import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkWeatherFavorability, getCoordinates } from '@/lib/meteo'

describe('meteo lib', () => {
  describe('checkWeatherFavorability', () => {
    it('returns favorable for good conditions', () => {
      const result = checkWeatherFavorability(20, 0, 10, 1)
      expect(result.isFavorable).toBe(true)
    })

    it('returns unfavorable for heavy rain', () => {
      const result = checkWeatherFavorability(20, 15, 10, 1)
      expect(result.isFavorable).toBe(false)
      expect(result.reason).toContain('Pluie diluvienne')
    })

    it('returns unfavorable for high wind', () => {
      const result = checkWeatherFavorability(20, 0, 90, 1)
      expect(result.isFavorable).toBe(false)
      expect(result.reason).toContain('Vent violent')
    })

    it('returns unfavorable for extreme cold', () => {
      const result = checkWeatherFavorability(-10, 0, 10, 1)
      expect(result.isFavorable).toBe(false)
      expect(result.reason).toContain('Froid extrême')
    })

    it('returns unfavorable for thunderstorms', () => {
      const result = checkWeatherFavorability(20, 0, 10, 95)
      expect(result.isFavorable).toBe(false)
      expect(result.reason).toContain("Risque d'orage")
    })

    it('returns unfavorable for heavy snow', () => {
      const result = checkWeatherFavorability(0, 0, 10, 75)
      expect(result.isFavorable).toBe(false)
      expect(result.reason).toContain('Fortes chutes de neige')
    })
  })

  describe('getCoordinates', () => {
    it('returns coordinates for a valid query', async () => {
      const mockCoords = { latitude: 50.8503, longitude: 4.3517 };
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [mockCoords]
        })
      } as Response)

      const coords = await getCoordinates('Bruxelles')
      expect(coords).toEqual(mockCoords)
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('name=Bruxelles'))
      fetchSpy.mockRestore()
    })

    it('returns null if no results found', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      } as Response)

      const coords = await getCoordinates('UnknownCity')
      expect(coords).toBeNull()
      fetchSpy.mockRestore()
    })

    it('returns null on fetch error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Down'))

      const coords = await getCoordinates('Bruxelles')
      expect(coords).toBeNull()
      fetchSpy.mockRestore()
    })
  })
})
