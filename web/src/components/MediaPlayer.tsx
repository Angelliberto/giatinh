'use client';

import dynamic from 'next/dynamic';
import { detectMediaProvider, isAudioUrl, spotifyEmbedHeight } from '@/lib/media';
import AudioPlayer from '@/components/AudioPlayer';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

type Props = {
  url: string;
  kind?: 'audio' | 'video' | 'playlist';
  title?: string;
  artist?: string;
  artwork?: string;
};

export default function MediaPlayer({ url, kind = 'video', title, artist, artwork }: Props) {
  const provider = detectMediaProvider(url);
  const isSpotify = provider === 'spotify';
  const audioLike =
    kind === 'audio' || kind === 'playlist' || isSpotify || (kind !== 'video' && isAudioUrl(url));

  if (audioLike && !isSpotify) {
    return (
      <AudioPlayer
        label={kind === 'playlist' ? 'Playlist' : 'Audio'}
        tracks={[
          {
            title: title || 'Untitled',
            artist: artist || 'GT.',
            url,
            artwork,
          },
        ]}
      />
    );
  }

  if (isSpotify) {
    const height = spotifyEmbedHeight(url);
    return (
      <div style={{ width: '100%', border: '1px solid #262626', background: '#121212', overflow: 'hidden' }}>
        <ReactPlayer src={url} controls width="100%" height={height} style={{ display: 'block' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        border: '1px solid #262626',
        background: '#121212',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
      }}
    >
      <ReactPlayer src={url} controls width="100%" height="100%" style={{ display: 'block' }} />
    </div>
  );
}
