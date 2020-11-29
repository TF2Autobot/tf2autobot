interface Author {
    name: string;
    url?: string;
    icon_url?: string;
}

interface Fields {
    name: string;
    value: string;
    inline?: boolean;
}

interface Footer {
    text: string;
    icon_url?: string;
}

interface Thumbnail {
    url: string;
}

interface Image {
    url: string;
}

interface Embeds {
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
