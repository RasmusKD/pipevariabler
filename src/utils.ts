import { useEffect } from 'react';

export const pixelatedIcons = [
    'compass',
    'clock',
    'recovery_compass',
];

export const useCompassImage = (item: string, setCompassImage: (image: string) => void, compassRef: React.RefObject<HTMLDivElement>) => {
    useEffect(() => {
        if (item === 'compass' || item === 'recovery_compass') {
            const handleMouseMove = (event: MouseEvent) => {
                if (compassRef.current) {
                    const rect = compassRef.current.getBoundingClientRect();
                    const compassCenterX = rect.left + rect.width / 2;
                    const compassCenterY = rect.top + rect.height / 2;
                    const angle = Math.atan2(event.clientY - compassCenterY, event.clientX - compassCenterX);
                    const angleDeg = angle * (180 / Math.PI) - 90;
                    const compassIndex = Math.round((angleDeg + 360) / 11.25) % 32;
                    const newCompassImage = `${item}_${String(item === 'compass' ? compassIndex : (compassIndex + 16) % 32).padStart(2, '0')}.png`;
                    setCompassImage(newCompassImage);
                }
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [item, setCompassImage, compassRef]);
};

export const useClockImage = (item: string, setClockImage: (image: string) => void) => {
    useEffect(() => {
        if (item === 'clock') {
            const updateClockImage = () => {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const totalMinutes = hours * 60 + minutes;
                const clockIndex = Math.floor(((totalMinutes + 720) % 1440) / 1440 * 64);
                const newClockImage = `clock_${String(clockIndex).padStart(2, '0')}.png`;
                setClockImage(newClockImage);
            };

            updateClockImage();
            const interval = setInterval(updateClockImage, 60000);
            return () => {
                clearInterval(interval);
            };
        }
    }, [item, setClockImage]);
};

export const useDragPreviewImage = (icon: string, compassImage: string, clockImage: string, setDragPreviewImage: (image: string) => void) => {
    useEffect(() => {
        const img = new Image();
        img.src = `assets/images/icons/${icon === 'compass' || icon === 'recovery_compass' ? compassImage : icon === 'clock' ? clockImage : `${icon}.png`}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const size = 48;

            if (context) {
                canvas.width = size;
                canvas.height = size;
                context.drawImage(img, 0, 0, size, size);

                setDragPreviewImage(canvas.toDataURL());
            }
        };
    }, [icon, compassImage, clockImage, setDragPreviewImage]);
};
