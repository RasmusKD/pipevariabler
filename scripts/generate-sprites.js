/**
 * Sprite Sheet Generator
 * 
 * Generates a sprite sheet from icons used in data.json
 * and outputs a sprite map for the React components.
 * 
 * Run with: node scripts/generate-sprites.js
 */

const Spritesmith = require('spritesmith');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/assets/images/icons');
const DATA_JSON_PATH = path.join(__dirname, '../src/data.json');
const OUTPUT_SPRITE = path.join(__dirname, '../public/assets/images/spritesheet.png');
const OUTPUT_MAP = path.join(__dirname, '../src/spriteMap.json');

// Read data.json and extract all used image names
function getUsedIcons() {
    const data = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
    const usedIcons = new Set();

    // Get all images from items
    data.items.forEach(item => {
        if (item.image) {
            usedIcons.add(item.image);
        }
    });

    // Also add common icons used elsewhere in the app
    const additionalIcons = [
        'barrel.png',
        'chest.png',
    ];
    additionalIcons.forEach(icon => usedIcons.add(icon));

    return usedIcons;
}

// Get all icon files in the directory
function getAllIconFiles() {
    return fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));
}

// Delete unused icons
function deleteUnusedIcons(usedIcons, allIcons) {
    const deleted = [];
    allIcons.forEach(icon => {
        if (!usedIcons.has(icon)) {
            const iconPath = path.join(ICONS_DIR, icon);
            try {
                fs.unlinkSync(iconPath);
                deleted.push(icon);
            } catch (err) {
                console.error(`Failed to delete ${icon}:`, err.message);
            }
        }
    });
    return deleted;
}

// Generate sprite sheet
function generateSprite(usedIcons) {
    const iconPaths = Array.from(usedIcons)
        .map(icon => path.join(ICONS_DIR, icon))
        .filter(p => fs.existsSync(p));

    console.log(`Generating sprite from ${iconPaths.length} icons...`);

    Spritesmith.run({ src: iconPaths }, (err, result) => {
        if (err) {
            console.error('Spritesmith error:', err);
            process.exit(1);
        }

        // Write sprite image
        fs.writeFileSync(OUTPUT_SPRITE, result.image);
        console.log(`Sprite saved to: ${OUTPUT_SPRITE}`);

        // Create sprite map with coordinates
        const spriteMap = {};
        Object.keys(result.coordinates).forEach(fullPath => {
            const iconName = path.basename(fullPath);
            const coords = result.coordinates[fullPath];
            spriteMap[iconName] = {
                x: coords.x,
                y: coords.y,
                width: coords.width,
                height: coords.height
            };
        });

        // Add sprite dimensions
        spriteMap._meta = {
            width: result.properties.width,
            height: result.properties.height,
            image: '/pipevariabler/assets/images/spritesheet.png'
        };

        fs.writeFileSync(OUTPUT_MAP, JSON.stringify(spriteMap, null, 2));
        console.log(`Sprite map saved to: ${OUTPUT_MAP}`);
        console.log(`Total icons in sprite: ${Object.keys(spriteMap).length - 1}`);
    });
}

// Main
console.log('=== Sprite Sheet Generator ===\n');

const usedIcons = getUsedIcons();
console.log(`Icons used in data.json: ${usedIcons.size}`);

const allIcons = getAllIconFiles();
console.log(`Total icons in folder: ${allIcons.length}`);

const unusedCount = allIcons.length - usedIcons.size;
console.log(`Unused icons to delete: ${unusedCount}\n`);

// Delete unused icons
console.log('Deleting unused icons...');
const deleted = deleteUnusedIcons(usedIcons, allIcons);
console.log(`Deleted ${deleted.length} unused icons.\n`);

// Generate sprite
generateSprite(usedIcons);
