import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS } from "@/entities/legal/model/legal-documents";
import LegalDocumentScreen from "./legal-document-screen";

describe("LegalDocumentScreen", () => {
  it("renders terms document title, revision date, and first section", () => {
    render(<LegalDocumentScreen documentType="terms" />);

    expect(
      screen.getByRole("heading", { level: 1, name: LEGAL_DOCUMENTS.terms.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(`최종 개정일: ${LEGAL_DOCUMENTS.terms.revisedAt}`)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: `1. ${LEGAL_DOCUMENTS.terms.sections[0].heading}`,
      }),
    ).toBeInTheDocument();
  });

  it("renders privacy document content for privacy type", () => {
    render(<LegalDocumentScreen documentType="privacy" />);

    expect(
      screen.getByRole("heading", { level: 1, name: LEGAL_DOCUMENTS.privacy.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(LEGAL_DOCUMENTS.privacy.sections[0].paragraphs[0])).toBeInTheDocument();
  });
});
