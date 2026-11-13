'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Post } from '@/lib/types';
import WorkCard, { formatWorkDate, workCover } from '@/components/WorkCard';
import { coverObjectPosition } from '@/components/CoverFrame';

export default function ArchivePage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    api<{ posts: Post[] }>('/api/posts')
      .then((d) => setPosts(d.posts))
      .catch(() => setPosts([]));
  }, []);

  return (
    <div style={{ background: '#0B0B0B', minHeight: '100vh' }} className="grain">
      <section
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: 'calc(64px + clamp(40px, 6vw, 80px)) clamp(16px, 3vw, 40px) 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 40,
            paddingBottom: 24,
            borderBottom: '1px solid #262626',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                color: '#8A8A8A',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: '0 0 12px',
              }}
            >
              Index
            </p>
            <h1
              style={{
                fontFamily: 'Playfair Display',
                fontWeight: 700,
                fontSize: 'clamp(36px, 5vw, 64px)',
                color: '#F4F4F0',
                margin: 0,
                fontStyle: 'italic',
                lineHeight: 0.95,
              }}
            >
              Archive
            </h1>
          </div>
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              letterSpacing: '0.12em',
            }}
          >
            {posts.length} WORK{posts.length === 1 ? '' : 'S'}
          </span>
        </div>

        <style>{`
          @media (max-width: 760px) {
            .archive-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <div
          className="archive-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          {posts.map((post) => (
            <WorkCard
              key={post._id}
              href={`/post/${post.slug}`}
              imageUrl={workCover(post.coverUrl)}
              title={post.title}
              date={formatWorkDate(post.publishedAt || post.createdAt)}
              objectPosition={coverObjectPosition(post.coverFocus)}
            />
          ))}
          {posts.length === 0 && (
            <p
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                color: '#8A8A8A',
                letterSpacing: '0.1em',
                gridColumn: '1 / -1',
              }}
            >
              NO PUBLISHED ENTRIES
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
