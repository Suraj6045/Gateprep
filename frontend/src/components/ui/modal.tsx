import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const modalOverlayClassName =
  "fixed inset-0 isolate z-50 bg-black/50 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

type ModalPrimitiveProps = {
  primitive: typeof DialogPrimitive
  slot: string
}

function ModalPortal({
  primitive: Primitive,
  slot,
  ...props
}: ModalPrimitiveProps & React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <Primitive.Portal data-slot={slot} {...props} />
}

type ModalOverlayProps = ModalPrimitiveProps &
  Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, "ref">

const ModalOverlay = React.forwardRef<HTMLDivElement, ModalOverlayProps>(function ModalOverlay({
  primitive: Primitive,
  slot,
  className,
  ...props
}, ref) {
  return (
    <Primitive.Overlay
      data-slot={slot}
      className={cn(modalOverlayClassName, className)}
      ref={ref}
      {...props} />
  )
})

type ModalContentProps = ModalPrimitiveProps &
  Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "ref">

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(function ModalContent({
  primitive: Primitive,
  slot,
  ...props
}, ref) {
  return <Primitive.Content data-slot={slot} ref={ref} {...props} />
})

function ModalCloseButton({
  primitive: Primitive,
  slot,
  className,
}: ModalPrimitiveProps & { className?: string }) {
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
