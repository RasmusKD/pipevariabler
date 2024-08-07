import { useEffect } from 'react';

export const pixelatedIcons = [
    'compass',
    'clock',
    'recovery_compass',
    'breeze_rod',
    'broken_elytra',
    'crafter',
    'mace',
    'bolt_armor_trim_smithing_template',
    'chiseled_copper',
    'chiseled_tuff',
    'chiseled_tuff_bricks',
    'copper_bulb',
    'copper_door',
    'copper_grate',
    'copper_trapdoor',
    'exposed_chiseled_copper',
    'exposed_copper_bulb',
    'exposed_copper_door',
    'exposed_copper_grate',
    'exposed_copper_trapdoor',
    'flow_armor_trim_smithing_template',
    'flow_banner_pattern',
    'flow_pottery_sherd',
    'guster_banner_pattern',
    'guster_pottery_sherd',
    'music_disc_creator',
    'music_disc_creator_music_box',
    'music_disc_precipice',
    'ominous_bottle',
    'ominous_trial_key',
    'oxidized_chiseled_copper',
    'oxidized_copper_bulb',
    'oxidized_copper_door',
    'oxidized_copper_grate',
    'oxidized_copper_trapdoor',
    'wind_charge',
    'trial_key',
    'tuff_bricks',
    'waxed_chiseled_copper',
    'waxed_copper_bulb',
    'waxed_copper_grate',
    'waxed_exposed_chiseled_copper',
    'waxed_exposed_copper_bulb',
    'waxed_exposed_copper_door',
    'waxed_exposed_copper_grate',
    'waxed_exposed_copper_trapdoor',
    'waxed_oxidized_chiseled_copper',
    'waxed_oxidized_copper_bulb',
    'waxed_oxidized_copper_door',
    'waxed_oxidized_copper_grate',
    'waxed_oxidized_copper_trapdoor',
    'waxed_weathered_chiseled_copper',
    'waxed_weathered_copper_bulb',
    'waxed_weathered_copper_door',
    'waxed_weathered_copper_grate',
    'waxed_weathered_copper_trapdoor',
    'weathered_chiseled_copper',
    'weathered_copper_bulb',
    'weathered_copper_door',
    'weathered_copper_grate',
    'weathered_copper_trapdoor'
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
