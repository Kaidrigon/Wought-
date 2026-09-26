import type { ThemeName } from "../theme/themes";
import type { LucideIcon } from "lucide-react";
import {
    House,
    Film,
    Tv,
    BookOpen,
    Heart,
    Settings,
    Clipboard,
} from "lucide-react";

type NavigationItem = {
    id: string;
    label: string;
    path: string;
    icon: LucideIcon;
    topbar: boolean;
    sidebar: boolean;
    theme?: ThemeName;
    homeAware?: boolean;
};

export const navigation: readonly NavigationItem[] = [

    {
    id: "home",
    label: "Home",
    path: "/",
    icon: House,
    topbar: false,
    sidebar: true,
    homeAware: true,
},
    {
    id: "movies",
    label: "Movies",
    path: "/movies",
    icon: Film,
    topbar : false,
    sidebar: true,
    homeAware: true,

    },

    {
    id: "tv",
    label: "TV Shows",
    path: "/tv",
    icon: Tv,
    homeAware: true,
    topbar: false,
    sidebar: true,
},

{
    id: "cinema",
    label:"Cinema",
    path: "/cinema",
    icon: Clipboard,
    topbar: true,
    sidebar: false,
    theme: "corporate"

},

    {
    id: "anime",
    label: "Anime",
    path: "/anime",
    icon: BookOpen,
    theme: "anime",
    topbar: true,
    sidebar: false,
},


    {
        id: "list",
        label: "My List",
        path: "/my-list",
        icon: Heart,
        topbar: false,
        sidebar: true,
        homeAware: true,
    },

    {
        id: "settings",
        label: "Settings",
        path: "/settings",
        icon: Settings,
        topbar: false,
        sidebar: true,
    },

] as const;