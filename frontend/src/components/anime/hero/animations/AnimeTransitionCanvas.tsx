
import {
    useEffect,
    useRef,
} from "react";

import AnimeTransitionEngine from "./AnimeTransitionEngine";

type AnimeTransitionCanvasProps = {
    desktopImage: string;
    mobileImage: string;
    direction?: "next" | "previous";
};

function getResponsiveImage(
    desktopImage: string,
    mobileImage: string
): string {
    const isMobile = window.matchMedia(
        "(max-width: 768px)"
    ).matches;

    return isMobile
        ? mobileImage || desktopImage
        : desktopImage || mobileImage;
}

export default function AnimeTransitionCanvas({
    desktopImage,
    mobileImage,
    direction = "next",
}: AnimeTransitionCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const engineRef = useRef<AnimeTransitionEngine | null>(null);

    const latestImageRef = useRef("");

    const directionRef = useRef(direction);

    useEffect(() => {
        directionRef.current = direction;
    }, [direction]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        let cancelled = false;

        const initialImage = getResponsiveImage(
            desktopImage,
            mobileImage
        );

        latestImageRef.current = initialImage;

        const engine = new AnimeTransitionEngine(container);

        engineRef.current = engine;

        const initialize = async () => {
            try {
                await engine.initialize(initialImage);

                if (cancelled) {
                    engine.destroy();
                    return;
                }

                const latestImage = latestImageRef.current;

                if (latestImage !== initialImage) {
                    await engine.transitionTo(
                        latestImage,
                        directionRef.current
                    );
                }
            } catch (error) {
                console.error(
                    "Anime transition engine initialization failed:",
                    error
                );
            }
        };

        void initialize();

        const handleResize = () => {
            const nextImage = getResponsiveImage(
                desktopImage,
                mobileImage
            );

            if (nextImage === latestImageRef.current) return;

            latestImageRef.current = nextImage;

            void engine.transitionTo(
                nextImage,
                directionRef.current
            );
        };

        const mediaQuery = window.matchMedia(
            "(max-width: 768px)"
        );

        mediaQuery.addEventListener("change", handleResize);

        return () => {
            cancelled = true;

            mediaQuery.removeEventListener(
                "change",
                handleResize
            );

            engine.destroy();

            if (engineRef.current === engine) {
                engineRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
    const nextImage = getResponsiveImage(
        desktopImage,
        mobileImage
    );

    if (nextImage === latestImageRef.current) return;

    latestImageRef.current = nextImage;

    void engineRef.current
        ?.transitionTo(nextImage, directionRef.current)
        .catch((error) => {
            console.warn(
                "Anime hero transition failed:",
                error
            );
        });
}, [desktopImage, mobileImage]);

    return (
        <div
            ref={containerRef}
            className="anime-transition-canvas"
            aria-hidden="true"
        />
    );
}
