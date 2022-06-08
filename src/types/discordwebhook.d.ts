export interface Author {
    name: string;
    url?: string;
    icon_url?: string;
}

export interface Fields {
    name: string;
    value: string;
    inline?: boolean;
}

export interface Footer {
    text: string;
    icon_url?: string;
}

export interface Thumbnail {
    url: string;
}

export interface Image {
    url: string;
}

export interface Embeds {
    color?: string;
    author?: Author;
    title?: string;
    url?: string;
    description?: string;
    fields?: Fields[];
    thumbnail?: Thumbnail;
    image?: Image;
    footer?: Footer;
}

export interface Webhook {
    username?: string;
    avatar_url?: string;
    content?: string;
    embeds?: Embeds[];
}
