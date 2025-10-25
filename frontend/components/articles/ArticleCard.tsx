"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { Clock, Eye, MessageCircle, Heart } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  status: string;
  publishedAt?: string;
  viewCount: number;
  readTime?: number;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const imageSrc = getFullMediaUrl(article.coverImage) || "/placeholder.png";

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-card/50 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden h-full flex flex-col group"
    >
      <Link href={`/blog/${article.slug}`} className="block">
        {article.coverImage && (
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        <Link href={`/blog/${article.slug}`} className="block">
          <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
        </Link>

        {article.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-grow">
            {article.excerpt}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-border/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{article.readTime || 1} min read</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    <span>{article.viewCount || 0}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3"/> {article._count?.likes || 0}
                </div>
                <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3"/> {article._count?.comments || 0}
                </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
