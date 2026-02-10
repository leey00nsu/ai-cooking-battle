export type DishFeedItem = {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  authorType: "user" | "bot";
  authorLabel: string;
};

export type DishFeedResponse = {
  items: DishFeedItem[];
  nextCursor: string | null;
};

export type DishFeedCursor = {
  createdAt: Date;
  id: string;
};

export type DishFeedSort = "latest" | "oldest" | "title_asc" | "title_desc";
