import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';

/**
 * Manages a toast notification with auto-dismiss.
 *
 * Usage:
 *   const { toast, showToast } = useToast();
 *   showToast('Saved!', 'success');
 */
export function useToast(defaultType: ToastType = 'success', duration = 3000) {
    const [toast, setToast] = useState<Toast>({ show: false, message: '', type: defaultType });

    const showToast = useCallback(
        (message: string, type: ToastType = defaultType) => {
            setToast({ show: true, message, type });
            setTimeout(() => setToast({ show: false, message: '', type: defaultType }), duration);
        },
        [defaultType, duration],
    );

    return { toast, showToast } as const;
}
