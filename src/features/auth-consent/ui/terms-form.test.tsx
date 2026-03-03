import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TermsForm from "./terms-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("TermsForm", () => {
  it("renders Terms/Privacy links to legal routes", () => {
    render(<TermsForm />);

    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });
});
