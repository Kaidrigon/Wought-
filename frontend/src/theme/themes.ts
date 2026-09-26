import { colors } from "./colors";

export const themes = {

    corporate: {

        ...colors.corporate,

        name: "Corporate",

    },

    anime: {

        ...colors.anime,

        name: "Anime",

    },

};

export type ThemeName = keyof typeof themes;