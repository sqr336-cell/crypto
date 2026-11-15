import { describe, expect, it } from 'vitest';
import { detectPlatform, hostOf, isLinkOnly, normalizeUrl, splitLinks } from '../links';

describe('links', () => {
  it('normalises to https and rejects junk', () => {
    expect(normalizeUrl('soundcloud.com/nayla')).toBe('https://soundcloud.com/nayla');
    expect(normalizeUrl('http://open.spotify.com/artist/1')).toBe('https://open.spotify.com/artist/1');
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('localhost')).toBeNull();
  });
  it('detects platforms', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=1')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/1')).toBe('youtube');
    expect(detectPlatform('https://music.apple.com/fr/album/1')).toBe('apple_music');
    expect(detectPlatform('https://nayla.bandcamp.com')).toBe('bandcamp');
    expect(detectPlatform('https://example.org')).toBe('website');
  });
  it('recognises link-only messages and splits URLs in text', () => {
    expect(isLinkOnly('soundcloud.com/x/y')).toBe(true);
    expect(isLinkOnly('écoute ça soundcloud.com/x')).toBe(false);
    expect(splitLinks('écoute https://a.com/x stp')).toEqual([{ text: 'écoute ' }, { text: 'https://a.com/x', url: 'https://a.com/x' }, { text: ' stp' }]);
    expect(hostOf('https://www.beatstars.com/x')).toBe('beatstars.com');
  });
});
