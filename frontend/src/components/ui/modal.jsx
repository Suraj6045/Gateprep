import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const modalOverlayClassName =
  "fixed inset-0 isolate z-50 bg-black/50 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

function ModalPortal({
  primitive: Primitive,
  slot,
  ...props
}) {
  return <Primitive.Portal data-slot={slot} {...props} />
}

function ModalOverlay({
  primitive: Primitive,
  slot,
  className,
  ...props
}) {
  return (
    <Primitive.Overlay
      data-slot={slot}
      className={cn(modalOverlayClassName, className)}
      {...props} />
  )
}

function ModalContent({
  primitive: Primitive,
  slot,
  ...props
}) {
  return <Primitive.Content data-slot={slot} {...props} />
}

function ModalCloseButton({
  primitive: Primitive,
  slot,
  className,
}) {
  return (
    <Primitive.Close data-slot={slot} asChild>
      <Button variant="ghost" className={className} size="icon-xl">
        <XIcon />
        <span className="sr-only">Close</span>
      </Button>
    </Primitive.Close>
  )
}

export {
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  ModalPortal,
  modalOverlayClassName,
}
