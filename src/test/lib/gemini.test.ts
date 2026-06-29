import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
});

describe('askGemini', () => {
    it('should call the API endpoint and return text', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ text: 'test response' }),
        });

        const { askGemini } = await import('../../lib/gemini');
        const result = await askGemini('test prompt');

        expect(mockFetch).toHaveBeenCalledWith('/api/kitchen-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'test prompt' }),
        });
        expect(result).toBe('test response');
    });

    it('should return error string on API error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Server error' }),
        });

        const { askGemini } = await import('../../lib/gemini');
        const result = await askGemini('test prompt');

        expect(result).toContain('Error');
    });

    it('should return error string on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { askGemini } = await import('../../lib/gemini');
        const result = await askGemini('test prompt');

        expect(result).toContain('Error');
        expect(result).toContain('Network error');
    });

    it('should still call API even with empty prompt', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ text: '' }),
        });

        const { askGemini } = await import('../../lib/gemini');
        const result = await askGemini('');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toBe('');
    });
});

describe('predictCategory', () => {
    it('should predict a category', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ text: 'Produce' }),
        });

        const { predictCategory } = await import('../../lib/gemini');
        const result = await predictCategory('Tomato', ['Produce', 'Meat', 'Spices']);

        expect(mockFetch).toHaveBeenCalledWith('/api/kitchen-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'Tomato',
                type: 'category',
                existingCategories: ['Produce', 'Meat', 'Spices'],
            }),
        });
        expect(result).toBe('Produce');
    });

    it('should return null on API failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { predictCategory } = await import('../../lib/gemini');
        const result = await predictCategory('Tomato', ['Produce']);

        expect(result).toBeNull();
    });
});
