import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const mediaDimmerVariants = cva("absolute inset-0", {
  variants: {
    tone: {
      representative:
        "bg-gradient-to-t from-black/85 via-black/20 to-transparent lg:bg-gradient-to-r",
      card: "bg-gradient-to-t from-black/85 via-black/45 to-transparent",
    },
    visibility: {
      always: "",
      hover: "md:opacity-0 md:transition md:group-hover:opacity-100",
    },
  },
  defaultVariants: {
    tone: "card",
    visibility: "always",
  },
});

type MediaDimmerProps = VariantProps<typeof mediaDimmerVariants> & {
  className?: string;
};

function MediaDimmer({ tone, visibility, className }: MediaDimmerProps) {
  return <div className={cn(mediaDimmerVariants({ tone, visibility }), className)} />;
}

export { MediaDimmer };
