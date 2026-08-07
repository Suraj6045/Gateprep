import { Input } from '@/components/ui/input'
import Search from 'lucide-react/dist/esm/icons/search'

export default function UsersSearchBar({ searchInput, setSearchInput }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search all users by name or email..."
        className="pl-10 h-10"
      />
    </div>
  )
}
