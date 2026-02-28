import { useEffect, type RefObject } from 'react';

/**
 * Calls `handler` when a click happens outside the given ref element.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside(ref, () => setOpen(false), isOpen);
 */
export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    handler: () => void,
    enabled = true,
) {
    useEffect(() => {
        if (!enabled) return;

        const listener = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };

        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler, enabled]);
}
