import { getLegalDocument, type LegalDocumentType } from "@/entities/legal/model/legal-documents";

type LegalDocumentScreenProps = {
  documentType: LegalDocumentType;
};

export default function LegalDocumentScreen({ documentType }: LegalDocumentScreenProps) {
  const document = getLegalDocument(documentType);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <header className="space-y-3 border-b border-white/10 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
            Legal Notice
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{document.title}</h1>
          <p className="text-sm text-white/65">최종 개정일: {document.revisedAt}</p>
        </header>

        <section className="space-y-8">
          {document.sections.map((section, index) => (
            <article className="space-y-3" key={`${section.heading}-${index}`}>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {index + 1}. {section.heading}
              </h2>
              <div className="space-y-3 text-sm leading-7 text-white/75 md:text-base">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.heading}-paragraph-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
