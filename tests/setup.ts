import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    chantier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    photo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    pointage: {
      create: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    affectationChantier: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    actionJournal: {
      create: vi.fn(),
    },
  },
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock getCurrentUser from @/lib/auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/img.jpg' } })),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://test.com/signed.jpg' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
  createServerClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  })),
}))

// Mock fetch if needed
import createFetchMock from 'vitest-fetch-mock'
const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()
fetchMocker.mockIf(/^https:\/\/api\.openstreetmap\.org\/.*$/, JSON.stringify([{ lat: 50.8503, lon: 4.3517 }]))
