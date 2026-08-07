import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it } from "vitest"

import { AvatarGroup, AvatarGroupCount } from "./avatar"
import { Badge } from "./badge"
import { Button, buttonVariants } from "./button"
import { CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import { modalOverlayClassName } from "./modal"
import { TableCell, TableHead } from "./table"
import { Tabs, TabsList, TabsTrigger } from "./tabs"

describe("shared UI accessibility defaults", () => {
  it("keeps ordinary buttons out of form submission by default", () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button")
  })

  it("exposes AvatarGroup size to its count indicator", () => {
    render(
      <AvatarGroup size="lg">
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>
    )

    expect(screen.getByText("+2").parentElement).toHaveAttribute("data-size", "lg")
  })

  it("hides decorative skeletons from assistive technology", () => {
    const { container } = render(<Skeleton />)

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true")
  })

  it("uses a consistent rounded control scale and ordered button sizes", () => {
    render(<Badge>Active</Badge>)

    expect(screen.getByText("Active")).toHaveClass("rounded-lg")
    expect(buttonVariants({ size: "lg" })).toContain("h-12")
    expect(buttonVariants({ size: "icon-lg" })).toContain("size-12")
  })

  it("keeps tabs touch-friendly and table headers visible while scrolling", () => {
    render(
      <>
        <Tabs defaultValue="first">
          <TabsList>
            <TabsTrigger value="first">First</TabsTrigger>
          </TabsList>
        </Tabs>
        <table><thead><tr><TableHead>Header</TableHead></tr></thead></table>
      </>
    )

    expect(screen.getByRole("tablist")).toHaveClass("group-data-horizontal/tabs:h-11")
    expect(screen.getByRole("columnheader", { name: "Header" })).toHaveClass("sticky", "top-0")
  })

  it("uses one shared overlay style for every modal surface", () => {
    expect(modalOverlayClassName).toContain("bg-black/50")
    expect(modalOverlayClassName).toContain("backdrop-blur-xs")
  })

  it("renders CardTitle as a heading and supports a deliberate level override", () => {
    render(
      <>
        <CardTitle>Default title</CardTitle>
        <CardTitle as="h2">Section title</CardTitle>
      </>
    )

    expect(screen.getByRole("heading", { name: "Default title", level: 3 })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Section title", level: 2 })).toBeInTheDocument()
  })

  it("allows table cell content to wrap on narrow screens", () => {
    render(<table><tbody><tr><TableCell>Long content</TableCell></tr></tbody></table>)

    expect(screen.getByRole("cell", { name: "Long content" })).toHaveClass("whitespace-normal", "sm:whitespace-nowrap")
  })
})
