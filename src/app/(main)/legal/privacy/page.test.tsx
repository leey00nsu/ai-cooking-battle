import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPrivacyPage from "./page";

describe("LegalPrivacyPage", () => {
  it("renders privacy document page", () => {
    render(<LegalPrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "개인정보 처리방침" }),
    ).toBeInTheDocument();
    expect(screen.getByText("최종 개정일: 2026-03-03")).toBeInTheDocument();
  });
});
