export interface CreateCreatorPostDTO {
  title: string;
  content: string;
  excerpt?: string;
  images?: string[];
  videoUrl?: string;
  attachments?: any;
  isPublic?: boolean;
  minimumTierId?: string;
  published?: boolean;
  publishedAt?: Date;
}

export interface UpdateCreatorPostDTO {
  title?: string;
  content?: string;
  excerpt?: string;
  images?: string[];
  videoUrl?: string;
  attachments?: any;
  isPublic?: boolean;
  minimumTierId?: string;
  published?: boolean;
  publishedAt?: Date;
}

export interface CreatorPostWithAccess {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  images: string[];
  videoUrl?: string;
  isPublic: boolean;
  minimumTierId?: string;
  likeCount: number;
  commentCount: number;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isCreator: boolean;
  };
  hasAccess: boolean; // User's access to this post
  requiredTier?: {
    id: string;
    name: string;
    price: number;
  };
}
