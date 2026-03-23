'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { searchAddress, type AddressSuggestion } from '@/lib/geo/photon-client'
import { Search } from 'lucide-react'

interface AddressAutocompleteProps {
  onSelect: (address: AddressSuggestion) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  onSelect,
  placeholder = 'Adresse eingeben...',
  className = '',
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Klick ausserhalb schliesst Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await searchAddress(q, 'de', 5, 'DE')
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setSelectedIndex(-1)
    } catch {
      setError('Adresssuche vorübergehend nicht verfügbar, bitte versuche es gleich nochmal.')
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.displayText)
    setSuggestions([])
    setIsOpen(false)
    setError(null)
    onSelect(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                     text-base focus:outline-none focus:ring-2 focus:ring-[#4CAF87]
                     focus:border-transparent disabled:opacity-50
                     min-h-[52px]"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-[#4CAF87] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-amber-600">{error}</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200
                     rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`px-4 py-3 cursor-pointer text-sm
                ${i === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}
                ${i > 0 ? 'border-t border-gray-100' : ''}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="text-gray-500">{s.displayText}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
