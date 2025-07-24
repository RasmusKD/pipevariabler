// config.ts
export const getAssetPath = (path: string): string => {
    // This will automatically use the correct base path based on your package.json homepage
    // For development: ""
    // For production on GitHub Pages: "/pipevariabler"
    return `${process.env.PUBLIC_URL}${path}`;
};

// You can also create specific helper functions
export const getIconPath = (iconName: string): string => {
    return getAssetPath(`/assets/images/icons/${iconName}`);
};