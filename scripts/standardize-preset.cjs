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

// Standard order for wood items (suffix order)
const woodItemOrder = [
    'button', 'door', 'fence', 'fence_gate', 'hanging_sign', 'log',
    'planks', 'pressure_plate', 'sign', 'slab', 'stairs', 'trapdoor',
    'wood', 'stripped_log', 'stripped_wood'
];

// Colors in the preset
const colorNames = [
    'white', 'light_gray', 'gray', 'black', 'brown', 'red', 'orange',
    'yellow', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'purple',
    'magenta', 'pink'
];

// Wood types in the preset
const woodTypes = [
    'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak',
    'mangrove', 'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak'
];

function getItemSuffix(itemName, prefixes) {
    for (const prefix of prefixes) {
        if (itemName.startsWith(prefix + '_')) {
            return itemName.substring(prefix.length + 1);
        }
        if (itemName.startsWith('stripped_' + prefix + '_')) {
            return 'stripped_' + itemName.substring(('stripped_' + prefix + '_').length);
        }
    }
    return itemName; // Return as-is for special items
}

function sortItems(items, orderArray, prefix) {
    const prefixes = [prefix];
    if (prefix.includes('_')) {
        // Handle multi-word prefixes like light_gray
        prefixes.push(prefix);
    }

    return items.sort((a, b) => {
        const suffixA = getItemSuffix(a.item, prefixes);
        const suffixB = getItemSuffix(b.item, prefixes);

        let indexA = orderArray.indexOf(suffixA);
        let indexB = orderArray.indexOf(suffixB);

        // Handle stripped_ variants
        if (indexA === -1 && suffixA.startsWith('stripped_')) {
            const baseSuffix = suffixA.replace('stripped_', '');
            indexA = orderArray.indexOf('stripped_' + baseSuffix);
            if (indexA === -1) indexA = orderArray.indexOf(baseSuffix);
            if (indexA !== -1) indexA += 0.5; // Put after non-stripped version
        }
        if (indexB === -1 && suffixB.startsWith('stripped_')) {
            const baseSuffix = suffixB.replace('stripped_', '');
            indexB = orderArray.indexOf('stripped_' + baseSuffix);
            if (indexB === -1) indexB = orderArray.indexOf(baseSuffix);
            if (indexB !== -1) indexB += 0.5;
        }

        // Unknown items go at the end
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        return indexA - indexB;
    });
}

// Process preset
preset.tabs.forEach(tab => {
    if (tab.name === 'Colors') {
        tab.chests.forEach(chest => {
            const colorPrefix = colorNames.find(c =>
                chest.items.some(item => item.item.startsWith(c + '_'))
            );
            if (colorPrefix) {
                chest.items = sortItems(chest.items, colorItemOrder, colorPrefix);
            }
        });
    }

    if (tab.name === 'Wood') {
        tab.chests.forEach(chest => {
            const woodPrefix = woodTypes.find(w =>
                chest.items.some(item =>
                    item.item.startsWith(w + '_') || item.item === w + '_log'
                )
            );
            if (woodPrefix) {
                chest.items = sortItems(chest.items, woodItemOrder, woodPrefix);
            }
        });
    }
});

// Write back
fs.writeFileSync(presetPath, JSON.stringify(preset, null, 4));
console.log('Preset item order standardized!');
