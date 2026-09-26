import { useEffect, useState } from "react";

import { breakpoints } from "../styles/breakpoints";

type Breakpoint =
    keyof typeof breakpoints;

function toPixels(value: string) {

    return Number.parseInt(value, 10);

}

export default function useBreakpoint(
    breakpoint: Breakpoint
) {

    const breakpointValue =
        toPixels(
            breakpoints[breakpoint]
        );

    const getMatches = () =>
        window.innerWidth <= breakpointValue;

    const [matches, setMatches] =
        useState(getMatches);

    useEffect(() => {

        const handleResize = () => {

            setMatches(
                getMatches()
            );

        };

        window.addEventListener(
            "resize",
            handleResize
        );

        return () => {

            window.removeEventListener(
                "resize",
                handleResize
            );

        };

    }, [breakpointValue]);

    return matches;

}