import { useState } from 'react'
import { apiSearchSongs } from '../../../api/api'

// Texto del buscador, resultados y estado "buscando...".
export function useSongSearch({ setStatusMessage }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  async function handleSearch(event) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setLoadingSearch(true)
    setStatusMessage('Buscando canciones...')

    try {
      const results = await apiSearchSongs(query)
      setSearchResults(results)
      setStatusMessage(`${results.length} resultados encontrados`)
    } catch {
      setStatusMessage('No se pudo buscar canciones. Reintenta.')
    } finally {
      setLoadingSearch(false)
    }
  }

  return { searchQuery, setSearchQuery, searchResults, loadingSearch, handleSearch }
}
