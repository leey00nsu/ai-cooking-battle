import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AppFooter from "./app-footer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children as ReactNode}
    </a>
  ),
}));

describe("AppFooter", () => {
  it("renders legal links with expected paths", () => {
    render(<AppFooter />);

    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/legal/privacy");
  });
});
