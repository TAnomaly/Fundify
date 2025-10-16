import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate RSS feed for a podcast (Apple Podcasts, Spotify compatible)
export const generateRSSFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { podcastId } = req.params;

    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        episodes: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://fundify.com';

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(podcast.title)}</title>
    <link>${baseUrl}/podcast/${podcast.id}</link>
    <language>${podcast.language}</language>
    <copyright>Copyright ${new Date().getFullYear()} ${escapeXml(podcast.creator.name)}</copyright>
    <description>${escapeXml(podcast.description || '')}</description>
    <image>
      <url>${escapeXml(podcast.coverImage || '')}</url>
      <title>${escapeXml(podcast.title)}</title>
      <link>${baseUrl}/podcast/${podcast.id}</link>
    </image>

    <itunes:author>${escapeXml(podcast.creator.name)}</itunes:author>
    <itunes:summary>${escapeXml(podcast.description || '')}</itunes:summary>
    <itunes:category text="${escapeXml(podcast.category)}" />
    <itunes:image href="${escapeXml(podcast.coverImage || '')}" />
    <itunes:explicit>no</itunes:explicit>
    <itunes:owner>
      <itunes:name>${escapeXml(podcast.creator.name)}</itunes:name>
      <itunes:email>${escapeXml(podcast.creator.email || '')}</itunes:email>
    </itunes:owner>

    <atom:link href="${baseUrl}/api/podcast/${podcast.id}/rss" rel="self" type="application/rss+xml" />
${podcast.episodes
  .map(
    (episode) => `
    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${baseUrl}/episode/${episode.id}</link>
      <pubDate>${new Date(episode.publishedAt || episode.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(episode.description || '')}</description>
      <enclosure url="${escapeXml(episode.audioUrl)}"
                 length="${episode.fileSize}"
                 type="${episode.mimeType}" />
      <guid isPermaLink="false">${episode.id}</guid>

      <itunes:title>${escapeXml(episode.title)}</itunes:title>
      <itunes:author>${escapeXml(podcast.author)}</itunes:author>
      <itunes:summary>${escapeXml(episode.description || '')}</itunes:summary>
      <itunes:image href="${escapeXml(episode.coverImage || podcast.coverImage || '')}" />
      <itunes:duration>${formatDuration(episode.duration)}</itunes:duration>
      ${episode.episodeNumber ? `<itunes:episode>${episode.episodeNumber}</itunes:episode>` : ''}
      ${episode.season ? `<itunes:season>${episode.season}</itunes:season>` : ''}
      <itunes:explicit>${podcast.isExplicit ? 'yes' : 'no'}</itunes:explicit>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml');
    res.send(rss);
  } catch (error) {
    console.error('Generate RSS feed error:', error);
    next(error);
  }
};

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to format duration for iTunes (HH:MM:SS)
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
