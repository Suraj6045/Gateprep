import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Context ──────────────────────────────────────────────────────────

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
  contentRef: React.MutableRefObject<HTMLDivElement | null>
  itemsMap: Map<string, React.ReactNode>
  registerItem: (value: string, label: React.ReactNode) => () => void
  highlightedIndex: number
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>
  itemValues: string[]
  contentId: string
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select provider")
  }
  return context
}

// ── Select Root ───────────────────────────────────────────────────────

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  optionsMap?: Map<string, React.ReactNode>
  children?: React.ReactNode
}

export function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  required = false,
  name,
  id,
  optionsMap,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlledValue = controlledValue !== undefined
  const value = isControlledValue ? controlledValue : uncontrolledValue

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlledOpen = controlledOpen !== undefined
  const open = isControlledOpen ? controlledOpen : uncontrolledOpen

  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [itemsMap, setItemsMap] = React.useState<Map<string, React.ReactNode>>(
    () => new Map(optionsMap ?? [])
  )
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [itemValues, setItemValues] = React.useState<string[]>(() =>
    optionsMap ? Array.from(optionsMap.keys()) : []
  )
  const contentId = React.useId()

  React.useEffect(() => {
    if (optionsMap) {
      setItemsMap(new Map(optionsMap))
      setItemValues(Array.from(optionsMap.keys()))
    }
  }, [optionsMap])

  const setOpen = React.useCallback(
    (action: React.SetStateAction<boolean>) => {
      const nextOpen = typeof action === "function" ? action(open) : action
      if (!isControlledOpen) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlledOpen, onOpenChange, open]
  )

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlledValue) {
        setUncontrolledValue(newVal)
      }
      onValueChange?.(newVal)
    },
    [isControlledValue, onValueChange]
  )

  const registerItem = React.useCallback(
    (val: string, label: React.ReactNode) => {
      setItemsMap((prev) => {
        const next = new Map(prev)
        next.set(val, label)
        return next
      })
      setItemValues((prev) => (prev.includes(val) ? prev : [...prev, val]))
      return () => {
        setItemsMap((prev) => {
          const next = new Map(prev)
          next.delete(val)
          return next
        })
        setItemValues((prev) => prev.filter((v) => v !== val))
      }
    },
    []
  )

  const contextValue: SelectContextValue = React.useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      triggerRef,
      contentRef,
      itemsMap,
      registerItem,
      highlightedIndex,
      setHighlightedIndex,
      itemValues,
      contentId,
      disabled,
      required,
      name,
      id,
    }),
    [
      value,
      handleValueChange,
      open,
      setOpen,
      itemsMap,
      registerItem,
      highlightedIndex,
      itemValues,
      contentId,
      disabled,
      required,
      name,
      id,
    ]
  )

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
      {name && <input type="hidden" name={name} value={value || ""} />}
    </SelectContext.Provider>
  )
}

// ── Select Trigger ────────────────────────────────────────────────────

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  SelectTriggerProps
>(function SelectTrigger({ className, children, id: propId, ...props }, ref) {
  const {
    open,
    setOpen,
    triggerRef,
    contentId,
    itemValues,
    highlightedIndex,
    setHighlightedIndex,
    onValueChange,
    value,
    disabled: contextDisabled,
    id: contextId,
  } = useSelectContext()

  const id = propId || contextId
  const isDisabled = props.disabled ?? contextDisabled

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
      }
    },
    [ref, triggerRef]
  )

  // Support test runner `fireEvent.change(trigger, { target: { value: '...' } })`
  React.useEffect(() => {
    const node = triggerRef.current
    if (!node) return

    const handleNativeChange = (e: Event) => {
      const target = e.target as HTMLButtonElement & { value?: string }
      if (target && typeof target.value === "string") {
        onValueChange?.(target.value)
      }
    }

    node.addEventListener("change", handleNativeChange)
    return () => {
      node.removeEventListener("change", handleNativeChange)
    }
  }, [triggerRef, onValueChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(e)
    if (e.defaultPrevented || isDisabled) return

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        const curIdx = value !== undefined ? itemValues.indexOf(value) : -1
        setHighlightedIndex(curIdx >= 0 ? curIdx : 0)
      } else {
        setHighlightedIndex((prev) => {
          if (itemValues.length === 0) return -1
          if (e.key === "ArrowDown") {
            return prev < itemValues.length - 1 ? prev + 1 : 0
          } else {
            return prev > 0 ? prev - 1 : itemValues.length - 1
          }
        })
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (open && highlightedIndex >= 0 && itemValues[highlightedIndex] !== undefined) {
        e.preventDefault()
        onValueChange?.(itemValues[highlightedIndex])
        setOpen(false)
      } else if (!open && e.key !== "Enter") {
        e.preventDefault()
        setOpen(true)
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === "Tab" && open) {
      setOpen(false)
    }
  }

  return (
    <button
      ref={setRefs}
      type="button"
      id={id}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={contentId}
      disabled={isDisabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={(e) => {
        props.onClick?.(e)
        if (!e.defaultPrevented && !isDisabled) {
          setOpen((prev) => !prev)
        }
      }}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  )
})

// ── Select Value ──────────────────────────────────────────────────────

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

export function SelectValue({
  placeholder = "Select an option",
  className,
}: SelectValueProps) {
  const { value, itemsMap } = useSelectContext()
  const displayLabel = value !== undefined && value !== "" ? itemsMap.get(value) : undefined

  return (
    <span
      data-slot="select-value"
      className={cn(
        "truncate block text-left flex-1 mr-2",
        displayLabel !== undefined && displayLabel !== ""
          ? "text-foreground"
          : "text-muted-foreground",
        className
      )}
    >
      {displayLabel !== undefined && displayLabel !== "" ? displayLabel : placeholder}
    </span>
  )
}

// ── Select Content ────────────────────────────────────────────────────

export interface SelectContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectContentProps
>(function SelectContent({ className, children, ...props }, ref) {
  const { open, setOpen, triggerRef, contentRef, contentId } = useSelectContext()
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Position calculation
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updateCoords = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 240
      const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight

      setCoords({
        top: showAbove ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updateCoords()
    window.addEventListener("resize", updateCoords)
    window.addEventListener("scroll", updateCoords, true)
    return () => {
      window.removeEventListener("resize", updateCoords)
      window.removeEventListener("scroll", updateCoords, true)
    }
  }, [open, triggerRef])

  // Click-outside listener
  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [open, setOpen, triggerRef, contentRef])

  if (!open || !mounted) return null

  const content = (
    <div
      ref={(node) => {
        contentRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      id={contentId}
      role="listbox"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: coords.width > 0 ? `${coords.width}px` : "auto",
        minWidth: coords.width > 0 ? `${coords.width}px` : "12rem",
      }}
      className={cn(
        "z-[100] max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )

  return createPortal(content, document.body)
})

// ── Select Item ───────────────────────────────────────────────────────

export interface SelectItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  children?: React.ReactNode
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  function SelectItem({ value: itemValue, disabled = false, className, children, ...props }, ref) {
    const {
      value,
      onValueChange,
      setOpen,
      registerItem,
      highlightedIndex,
      itemValues,
      triggerRef,
    } = useSelectContext()

    React.useEffect(() => {
      return registerItem(itemValue, children)
    }, [itemValue, children, registerItem])

    const isSelected = value === itemValue
    const isHighlighted = itemValues[highlightedIndex] === itemValue

    const handleSelect = () => {
      if (disabled) return
      onValueChange?.(itemValue)
      setOpen(false)
      triggerRef.current?.focus()
    }

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        data-state={isSelected ? "checked" : "unchecked"}
        data-highlighted={isHighlighted ? "" : undefined}
        onClick={handleSelect}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm text-foreground outline-none transition-colors",
          "hover:bg-primary/15 hover:text-primary",
          isHighlighted && "bg-primary/15 text-primary",
          isSelected && "bg-primary/10 text-primary font-medium",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4 text-primary" />
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>
    )
  }
)

// ── Select Group, Label, Separator ────────────────────────────────────

export function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="select-group" className={cn("p-1", className)} {...props} />
}

export function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  )
}

export function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

// ── CustomSelect (High-level drop-in component) ───────────────────────

export interface CustomSelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface CustomSelectProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

export function CustomSelect({
  value,
  defaultValue,
  onChange,
  options,
  placeholder = "— Select —",
  id,
  name,
  disabled = false,
  required = false,
  className,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: CustomSelectProps) {
  const optionsMap = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>()
    options.forEach((opt) => map.set(opt.value, opt.label))
    return map
  }, [options])

  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      name={name}
      id={id}
      disabled={disabled}
      required={required}
      optionsMap={optionsMap}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={cn(className, triggerClassName)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
