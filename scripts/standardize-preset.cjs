// Script to standardize item order in Ivers Kisterum preset
const fs = require('fs');
const path = require('path');

const presetPath = path.join(__dirname, '..', 'public', 'presets', 'ivers_kisterum.json');
let fileContent = fs.readFileSync(presetPath, 'utf8');
// Remove BOM if present
if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
}
const preset = JSON.parse(fileContent);

// Standard order for color items (suffix order)
const colorItemOrder = [
    'banner', 'bed', 'candle', 'carpet', 'concrete', 'concrete_powder',
    'dye', 'glazed_terracotta', 'shulker_box', 'stained_glass',
    'stained_glass_pane', 'terracotta', 'wool'
];

// Standard order for wood items - full blocks first, then details
const woodItemOrder = [
    'log', 'wood', 'planks', 'slab', 'stairs',  // Full blocks first
    'stripped_log', 'stripped_wood',             // Stripped variants
    'fence', 'fence_gate',                       // Fences
    'door', 'trapdoor',                          // Doors
    'button', 'pressure_plate',                  // Redstone
    'sign', 'hanging_sign',                      // Signs
    'boat', 'chest_boat'                         // Boats last
];

// Get suffix from item name
function getSuffix(itemName, prefix) {
    // Handle stripped_ prefix
    if (itemName.startsWith('stripped_')) {
        const rest = itemName.substring('stripped_'.length);
        if (rest.startsWith(prefix + '_')) {
            return 'stripped_' + rest.substring(prefix.length + 1);
        }
    }
    // Normal prefix
    if (itemName.startsWith(prefix + '_')) {
        return itemName.substring(prefix.length + 1);
    }
    return null;
}

function sortColorItems(items, colorPrefix) {
    return [...items].sort((a, b) => {
        const suffixA = getSuffix(a.item, colorPrefix) || a.item;
        const suffixB = getSuffix(b.item, colorPrefix) || b.item;

        let indexA = colorItemOrder.indexOf(suffixA);
        let indexB = colorItemOrder.indexOf(suffixB);

        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        return indexA - indexB;
    });
}

function sortWoodItems(items, woodPrefix) {
    return [...items].sort((a, b) => {
        let suffixA = getSuffix(a.item, woodPrefix);
        let suffixB = getSuffix(b.item, woodPrefix);

        // Handle special cases like bamboo_block, bamboo_mosaic
        if (suffixA === null) suffixA = a.item;
        if (suffixB === null) suffixB = b.item;

        // Handle nether woods with stem/hyphae
        if (suffixA === 'stem') suffixA = 'log';
        if (suffixB === 'stem') suffixB = 'log';
        if (suffixA === 'hyphae') suffixA = 'wood';
        if (suffixB === 'hyphae') suffixB = 'wood';
        if (suffixA === 'stripped_stem') suffixA = 'stripped_log';
        if (suffixB === 'stripped_stem') suffixB = 'stripped_log';
        if (suffixA === 'stripped_hyphae') suffixA = 'stripped_wood';
        if (suffixB === 'stripped_hyphae') suffixB = 'stripped_wood';

        // Handle bamboo block
        if (suffixA === 'block' || a.item === 'bamboo_block') suffixA = 'log';
        if (suffixB === 'block' || b.item === 'bamboo_block') suffixB = 'log';
        if (suffixA === 'stripped_block' || a.item === 'stripped_bamboo_block') suffixA = 'stripped_log';
        if (suffixB === 'stripped_block' || b.item === 'stripped_bamboo_block') suffixB = 'stripped_log';

        let indexA = woodItemOrder.indexOf(suffixA);
        let indexB = woodItemOrder.indexOf(suffixB);

        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        return indexA - indexB;
    });
}

// Wood types
const woodTypes = [
    'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak',
    'mangrove', 'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak'
];

const colorNames = [
    'white', 'light_gray', 'gray', 'black', 'brown', 'red', 'orange',
    'yellow', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'purple',
    'magenta', 'pink'
];

// Process preset
preset.tabs.forEach(tab => {
    if (tab.name === 'Colors') {
        tab.chests.forEach(chest => {
            const colorPrefix = colorNames.find(c =>
                chest.items.some(item => item.item.startsWith(c + '_'))
            );
            if (colorPrefix) {
                chest.items = sortColorItems(chest.items, colorPrefix);
            }
        });
    }

    if (tab.name === 'Woods') {
        tab.chests.forEach(chest => {
            const woodPrefix = woodTypes.find(w =>
                chest.items.some(item =>
                    item.item.startsWith(w + '_') ||
                    item.item.startsWith('stripped_' + w + '_')
                )
            );
            if (woodPrefix) {
                console.log(`Sorting ${chest.label} with prefix ${woodPrefix}`);
                chest.items = sortWoodItems(chest.items, woodPrefix);
            }
        });
    }
});

// Write back
fs.writeFileSync(presetPath, JSON.stringify(preset, null, 4));
console.log('Preset item order standardized!');
