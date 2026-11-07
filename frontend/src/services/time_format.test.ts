import { describe, it, expect } from 'vitest';
import { formatTime } from './time_format';

describe('Time Formatting', () => {
    it('Given whole minutes, When formatting, Then should return M:00', () => {
        expect(formatTime(1)).toBe('1:00');
        expect(formatTime(30)).toBe('30:00');
    });

    it('Given fractional minutes, When formatting, Then should convert the fraction to seconds', () => {
        expect(formatTime(1.5)).toBe('1:30');
        expect(formatTime(25.75)).toBe('25:45');
    });

    it('Given a value with under 10 seconds, When formatting, Then should pad seconds with a leading zero', () => {
        expect(formatTime(1.1)).toBe('1:06');
        expect(formatTime(20.083333)).toBe('20:05');
    });

    it('Given zero or less than one minute, When formatting, Then should return 0:SS', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(0.5)).toBe('0:30');
    });

    it('Given a value just over a whole minute, When formatting, Then should round to the nearest second', () => {
        expect(formatTime(1.008333)).toBe('1:00'); // 1.008333 * 60 = 60.49 seconds, we round down to 60 = 1:00 :)))
    });
});
