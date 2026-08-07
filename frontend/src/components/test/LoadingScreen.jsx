import Spinner from '../shared/Spinner'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center theme-surface">
      <Spinner size={36} className="text-primary" />
    </div>
  )
}
