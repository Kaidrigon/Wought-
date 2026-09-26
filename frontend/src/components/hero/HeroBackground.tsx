import {
    useEffect,
    useRef,
} from "react";

import "./HeroBackground.css";

type HeroBackgroundProps = {
    desktopImage: string;
    mobileImage: string;
};

export default function HeroBackground({
    desktopImage,
    mobileImage,
}: HeroBackgroundProps) {
    const containerRef =
        useRef<HTMLDivElement>(null);

    const imageRef =
        useRef<HTMLImageElement>(null);

    useEffect(() => {
        const container =
            containerRef.current;

        const image =
            imageRef.current;

        if (!container || !image) {
            return;
        }

        if (
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            return;
        }

        let targetX = 0;
        let targetY = 0;

        let currentX = 0;
        let currentY = 0;

        let animationFrame = 0;

        const update = () => {
            currentX +=
                (targetX - currentX) * 0.055;

            currentY +=
                (targetY - currentY) * 0.055;

            image.style.transform =
                `translate3d(${currentX}px, ${currentY}px, 0) scale(1.035)`;

            animationFrame =
                requestAnimationFrame(update);
        };

        const handlePointerMove =
            (event: PointerEvent) => {
                const rect =
                    container.getBoundingClientRect();

                if (
                    rect.width <= 0 ||
                    rect.height <= 0
                ) {
                    return;
                }

                const normalizedX =
                    (event.clientX - rect.left) /
                        rect.width -
                    0.5;

                const normalizedY =
                    (event.clientY - rect.top) /
                        rect.height -
                    0.5;

                targetX =
                    normalizedX * 12;

                targetY =
                    normalizedY * 7;
            };

        const reset =
            () => {
                targetX = 0;
                targetY = 0;
            };

        container.addEventListener(
            "pointermove",
            handlePointerMove
        );

        container.addEventListener(
            "pointerleave",
            reset
        );

        animationFrame =
            requestAnimationFrame(update);

        return () => {
            container.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            container.removeEventListener(
                "pointerleave",
                reset
            );

            cancelAnimationFrame(
                animationFrame
            );
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="hero-background"
        >
            <picture className="hero-background__picture">
                <source
                    media="(max-width: 768px)"
                    srcSet={mobileImage}
                />

                <img
                    ref={imageRef}
                    src={desktopImage}
                    alt=""
                    className="hero-background__image"
                />
            </picture>

            <div className="hero-background__overlay" />
        </div>
    );
}