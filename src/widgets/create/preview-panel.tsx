import { Card, CardContent } from "@/shared/ui/card";

type PreviewPanelProps = {
  imageUrl?: string | null;
  isBlurred?: boolean;
};

export default function PreviewPanel({ imageUrl, isBlurred }: PreviewPanelProps) {
  return (
    <Card tone="ghost" className="mt-auto">
      <CardContent className="pt-6">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 text-sm text-white/50">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Generated dish"
              className={`h-full w-full object-contain ${isBlurred ? "blur-md" : ""}`}
            />
          ) : (
            <span>Dish preview will appear here</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
