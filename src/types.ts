// Shared type definitions - single source of truth

export interface Item {
    uid: string;
    item: string;
    variable: string;
    image: string;
}

export interface Chest {
    id: number;
    label: string;
    items: Item[];
    icon: string;
    checked: boolean;
}

export interface Tab {
    id: number;
    name: string;
    chests: Chest[];
}

export interface Profile {
    name: string;
    tabs?: Tab[];
    chests?: Chest[];
}
