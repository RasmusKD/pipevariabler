import React, { memo } from 'react';
import spriteMap from './spriteMap.json';

interface SpriteIconProps {
    /** Icon filename, e.g. "stone.png" */
    icon: string;
    /** Size in pixels (default: 32) */
    size?: number;
    /** Additional CSS class */
    className?: string;
    /** Click handler */
    onClick?: () => void;
    /** Alt text for accessibility */
    alt?: string;
}

// Get sprite sheet URL from process.env
const SPRITE_URL = `${process.env.PUBLIC_URL}/assets/images/spritesheet.png`;

// Type for sprite coordinates
interface SpriteCoords {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Get sprite data - use any to avoid complex typing with _meta
const spriteData = spriteMap as any;
const spriteWidth = spriteData._meta?.width || 2304;

/**
 * SpriteIcon - displays an icon from the sprite sheet
 * Uses CSS background-position for efficient rendering
 */
const SpriteIcon: React.FC<SpriteIconProps> = memo(({
    icon,
    size = 32,
    className = '',
    onClick,
    alt
}) => {
    const coords = spriteData[icon] as SpriteCoords | undefined;

    // Fallback for missing icons
    if (!coords) {
        console.warn(`SpriteIcon: Icon "${icon}" not found in sprite map`);
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: '#333',
                    display: 'inline-block'
                }}
                title={alt || icon}
            />
        );
    }

    // Calculate scale factor (sprite icons are 64x64, we want to show at `size`)
    const scale = size / coords.width;

    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                width: size,
                height: size,
                backgroundImage: `url(${SPRITE_URL})`,
                backgroundPosition: `-${coords.x * scale}px -${coords.y * scale}px`,
                backgroundSize: `${spriteWidth * scale}px auto`,
                backgroundRepeat: 'no-repeat',
                display: 'inline-block',
                imageRendering: 'pixelated', // Keep crisp pixels
            }}
            role="img"
            aria-label={alt || icon.replace('.png', '').replace(/_/g, ' ')}
            title={alt || icon.replace('.png', '').replace(/_/g, ' ')}
        />
    );
});

SpriteIcon.displayName = 'SpriteIcon';

export default SpriteIcon;
