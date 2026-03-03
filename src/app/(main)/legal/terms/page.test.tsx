import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalTermsPage from "./page";

describe("LegalTermsPage", () => {
  it("renders terms document page", () => {
    render(<LegalTermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeInTheDocument();
    expect(screen.getByText("최종 개정일: 2026-03-03")).toBeInTheDocument();
  });
});
