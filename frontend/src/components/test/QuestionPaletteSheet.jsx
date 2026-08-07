import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export default function QuestionPaletteSheet({
  children, // The sidebar
  current,
  questions,
  showPalette,
  setShowPalette,
}) {
  return (
    <Sheet open={showPalette} onOpenChange={setShowPalette}>
      <SheetTrigger asChild>
        <Button
          className="md:hidden fixed bottom-16 right-4 z-30 flex items-center gap-1.5 rounded-full shadow-lg"
          size="sm"
        >
          Q{current + 1}/{questions.length}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] sm:w-80 p-0 overflow-y-auto">
        <SheetHeader className="p-3 border-b text-left px-4">
          <SheetTitle className="text-sm">Question Palette</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
