import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 pt-14 pb-mobile-nav sm:pb-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
