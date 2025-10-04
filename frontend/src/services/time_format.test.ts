import { describe, it, expect } from 'vitest';
import { formatTime } from './time_format';

describe('Time Formatting', () => {
    it('should format whole minutes correctly', () => {
        expect(formatTime(1)).toBe('1:00');
        expect(formatTime(30)).toBe('30:00');
    });

    it('should format decimal minutes correctly', () => {
        expect(formatTime(1.5)).toBe('1:30');
        expect(formatTime(25.75)).toBe('25:45');
    });

    it('should pad seconds with leading zero', () => {
        expect(formatTime(1.1)).toBe('1:06');
        expect(formatTime(20.083333)).toBe('20:05');
    });

    it('should handle edge cases', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(0.5)).toBe('0:30');
    });

    it('should round seconds correctly', () => {
        expect(formatTime(1.008333)).toBe('1:00'); // 1.008333 * 60 = 60.49 seconds, we round down to 60 = 1:00 :)))
    });
});
