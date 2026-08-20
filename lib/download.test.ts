import { describe, expect, it, vi } from 'vitest';
import { downloadJson } from './download';

describe('downloadJson', () => {
  it('safely no-ops in non-DOM environment', () => {
    expect(() => downloadJson({ foo: 'bar' }, 'test.json')).not.toThrow();
  });

  it('creates object URL and triggers download when document exists', () => {
    const click = vi.fn();
    const mockLink = { href: '', download: '', click };
    const createElement = vi.fn().mockReturnValue(mockLink);
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('document', { createElement });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    downloadJson({ score: 100 }, 'session.json');

    expect(createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:test');
    expect(mockLink.download).toBe('session.json');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    vi.unstubAllGlobals();
  });
});
