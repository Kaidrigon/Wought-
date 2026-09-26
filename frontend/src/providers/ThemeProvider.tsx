import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import type { ReactNode } from "react";

import { useLocation } from "react-router-dom";

import { themes } from "../theme/themes";
import type { ThemeName } from "../theme/themes";

export type SectionName =
    | "cinema"
    | "anime";

type ThemeContextType = {

    theme: ThemeName;

    section: SectionName;

    // Temporary.
    // We'll delete this in the next cleanup.
    setTheme: (
        theme: ThemeName
    ) => void;

};

const ThemeContext =
    createContext<ThemeContextType | null>(
        null
    );

type Props = {

    children: ReactNode;

};

export function ThemeProvider({
    children,
}: Props) {

    const location =
        useLocation();

    const section: SectionName =
        location.pathname.startsWith("/anime")
            ? "anime"
            : "cinema";

    const derivedTheme: ThemeName =
        section === "anime"
            ? "anime"
            : "corporate";

    // Temporary state.
    // Removed next step.
    const [theme, setTheme] =
        useState<ThemeName>(
            derivedTheme
        );

    useEffect(() => {

        setTheme(derivedTheme);

    }, [derivedTheme]);

    // Apply CSS variables BEFORE the browser paints.
    useLayoutEffect(() => {

        const root =
            document.documentElement;

        const current =
            themes[theme];

        Object.entries(current).forEach(
            ([key, value]) => {

                if (
                    typeof value ===
                    "string"
                ) {

                    root.style.setProperty(
                        `--${key}`,
                        value
                    );

                }

            }
        );

    }, [theme]);

    const value =
        useMemo(
            () => ({
                theme,
                section,
                setTheme,
            }),
            [theme, section]
        );

    return (

        <ThemeContext.Provider
            value={value}
        >

            {children}

        </ThemeContext.Provider>

    );

}

export function useTheme() {

    const context =
        useContext(
            ThemeContext
        );

    if (!context) {

        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );

    }

    return context;

}