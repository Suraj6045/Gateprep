import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { ReactElement } from 'react'

export interface UsersSearchBarProps {
  searchInput: string
  setSearchInput: (value: string) => void
}

export default function UsersSearchBar({ searchInput, setSearchInput }: UsersSearchBarProps): ReactElement {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        id="admin-users-search"
        name="userSearch"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        autoComplete="off"
        placeholder="Search all users by name or email..."
        className="pl-10 h-10"
      />
    </div>
  )
}
