import { sessionProgressCaption } from '@/features/play/progress';

describe('sessionProgressCaption', () => {
  it('shows points of target while below the target', () => {
    expect(sessionProgressCaption(3, 10)).toEqual({
      key: 'play.progress',
      options: { count: 3, target: 10 },
    });
    expect(sessionProgressCaption(0, 10).key).toBe('play.progress');
  });

  it('says the target is reached at or above the target', () => {
    expect(sessionProgressCaption(10, 10).key).toBe('play.progressReached');
    expect(sessionProgressCaption(12, 10)).toEqual({
      key: 'play.progressReached',
      options: { count: 12, target: 10 },
    });
  });

  it('never claims a reached target when the session has none', () => {
    expect(sessionProgressCaption(0, 0).key).toBe('play.progress');
  });
});
