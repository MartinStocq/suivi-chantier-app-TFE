'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useRef } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({
  placeholder = 'Rechercher...',
  paramKey = 'q',
}: {
  placeholder?: string
  paramKey?: string
}) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const inputRef     = useRef<HTMLInputElement>(null)

  const value = searchParams.get(paramKey) ?? ''

  const handleChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set(paramKey, val)
    else params.delete(paramKey)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="relative flex-1 max-w-xs">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-7 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white transition"
      />
      {value && (
        <button
          onClick={() => {
            handleChange('')
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}