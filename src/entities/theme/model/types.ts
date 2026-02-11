export type Theme = {
  dayKey: string;
  themeText: string;
  themeTextEn: string;
  axisAType?: "상황" | "장소" | "분위기";
  axisA?: string;
  axisBType?: "음식종류" | "특정재료" | "조리법";
  axisB?: string;
  axisFlavor?: string;
  themeWeights?: {
    A: number;
    B: number;
    F: number;
  };
  themeSignals?: {
    A: string[];
    B: string[];
    F: string[];
  };
  themeImageUrl?: string | null;
  isPending?: boolean;
};
