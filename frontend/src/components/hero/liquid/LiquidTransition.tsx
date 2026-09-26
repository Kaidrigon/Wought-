import {
    useEffect,
    useRef,
} from "react";

import {
    Application,
    Container,
    DisplacementFilter,
    Sprite,
    Texture,
} from "pixi.js";

import { gsap } from "gsap";

import "./LiquidTransition.css";

type HeroDirection =
    | "next"
    | "previous";

type LiquidTransitionProps = {
    desktopImage: string;
    mobileImage: string;
    direction: HeroDirection;
};

type LoadedImage = {
    sprite: Sprite;
    texture: Texture;
    baseScale: number;
};

type PointerState = {
    x: number;
    y: number;
    previousX: number;
    previousY: number;
    velocity: number;
    down: boolean;
};

export default function LiquidTransition({
    desktopImage,
    mobileImage,
    direction,
}: LiquidTransitionProps) {

    const containerRef =
        useRef<HTMLDivElement>(null);

    const appRef =
        useRef<Application | null>(null);

    const sceneRef =
        useRef<Container | null>(null);

    const imageLayerRef =
        useRef<Container | null>(null);

    const currentRef =
        useRef<LoadedImage | null>(null);

    const displacementRef =
        useRef<{
            sprite: Sprite;
            filter: DisplacementFilter;
        } | null>(null);

    const currentImageRef =
        useRef<string>("");

    const initializedRef =
        useRef(false);

    const transitionRef =
        useRef<gsap.core.Timeline | null>(null);

    const interactionTweenRef =
        useRef<gsap.core.Tween | null>(null);

    const pointerRef =
        useRef<PointerState>({
            x: 0.5,
            y: 0.5,
            previousX: 0.5,
            previousY: 0.5,
            velocity: 0,
            down: false,
        });

    const directionRef =
        useRef<HeroDirection>(
            direction
        );

    const interactionTargetRef =
        useRef({
            x: 0,
            y: 0,
        });

    const interactionCurrentRef =
        useRef({
            x: 0,
            y: 0,
        });

    const isTransitioningRef =
        useRef(false);

    const isPageVisibleRef =
        useRef(true);

    const getResponsiveImage = () => {

        const isMobile =
            window.matchMedia(
                "(max-width: 768px)"
            ).matches;

        return isMobile
            ? mobileImage
            : desktopImage;
    };

    const startRendering = () => {

        const app =
            appRef.current;

        if (
            !app ||
            document.hidden ||
            !isPageVisibleRef.current
        ) {
            return;
        }

        app.ticker.start();
    };

    const loadTexture = (
        source: string
    ): Promise<Texture> => {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const img =
                    new Image();

                img.crossOrigin =
                    "anonymous";

                img.decoding =
                    "async";

                img.onload = () => {

                    try {

                        resolve(
                            Texture.from(
                                img
                            )
                        );

                    } catch (error) {

                        reject(
                            error
                        );
                    }
                };

                img.onerror = () => {

                    reject(
                        new Error(
                            `Failed to load hero image: ${source}`
                        )
                    );
                };

                img.src =
                    source;
            }
        );
    };

    const fitSprite = (
        sprite: Sprite,
        texture: Texture,
        width: number,
        height: number
    ) => {

        if (
            width <= 0 ||
            height <= 0 ||
            texture.width <= 0 ||
            texture.height <= 0
        ) {
            return 1;
        }

        const scale =
            Math.max(
                width /
                    texture.width,
                height /
                    texture.height
            );

        sprite.scale.set(
            scale
        );

        sprite.position.set(
            width / 2,
            height / 2
        );

        return scale;
    };

    const createDisplacementMap = () => {

        /*
         * 512x512 keeps the liquid map detailed
         * enough for a full-screen hero while using
         * much less memory than the previous 1024 map.
         */
        const size =
            512;

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            size;

        canvas.height =
            size;

        const context =
            canvas.getContext(
                "2d"
            );

        if (!context) {

            throw new Error(
                "Could not create displacement canvas."
            );
        }

        const imageData =
            context.createImageData(
                size,
                size
            );

        const data =
            imageData.data;

        for (
            let y = 0;
            y < size;
            y++
        ) {

            for (
                let x = 0;
                x < size;
                x++
            ) {

                const index =
                    (y * size + x) * 4;

                const nx =
                    x / size;

                const ny =
                    y / size;

                const waveX =
                    Math.sin(
                        nx * 18 +
                        Math.sin(
                            ny * 9
                        ) * 4
                    );

                const waveY =
                    Math.cos(
                        ny * 16 +
                        Math.sin(
                            nx * 11
                        ) * 5
                    );

                const detailX =
                    Math.sin(
                        nx * 42 +
                        ny * 15
                    );

                const detailY =
                    Math.cos(
                        ny * 38 -
                        nx * 17
                    );

                const dx =
                    nx - 0.5;

                const dy =
                    ny - 0.5;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                const ripple =
                    Math.sin(
                        distance * 42
                    );

                data[index] =
                    Math.max(
                        0,
                        Math.min(
                            255,
                            128 +
                            waveX * 38 +
                            detailX * 16 +
                            ripple * 18
                        )
                    );

                data[index + 1] =
                    Math.max(
                        0,
                        Math.min(
                            255,
                            128 +
                            waveY * 38 +
                            detailY * 16 +
                            ripple * 14
                        )
                    );

                data[index + 2] =
                    128;

                data[index + 3] =
                    255;
            }
        }

        context.putImageData(
            imageData,
            0,
            0
        );

        return Texture.from(
            canvas
        );
    };

    const resizeScene = () => {

        const imageLayer =
            imageLayerRef.current;

        const displacement =
            displacementRef.current;

        const container =
            containerRef.current;

        if (
            !imageLayer ||
            !container
        ) {
            return;
        }

        const width =
            container.clientWidth;

        const height =
            container.clientHeight;

        if (
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        imageLayer.children.forEach(
            child => {

                if (
                    child instanceof Sprite
                ) {

                    const loadedImage =
                        currentRef.current;

                    if (
                        loadedImage &&
                        loadedImage.sprite === child
                    ) {

                        const baseScale =
                            fitSprite(
                                child,
                                child.texture,
                                width,
                                height
                            );

                        loadedImage.baseScale =
                            baseScale;

                        return;
                    }

                    const scale =
                        fitSprite(
                            child,
                            child.texture,
                            width,
                            height
                        );

                    /*
                     * During a transition the incoming
                     * image may currently be larger than
                     * its fitted size. We don't overwrite
                     * that visual state here.
                     */
                    if (
                        child ===
                        imageLayer.children[
                            imageLayer.children.length - 1
                        ]
                    ) {
                        child.scale.set(
                            scale
                        );
                    }
                }
            }
        );

        if (displacement) {

            displacement.sprite.width =
                width;

            displacement.sprite.height =
                height;
        }
    };

    const settleInteraction = () => {

        const displacement =
            displacementRef.current;

        if (!displacement) {
            return;
        }

        interactionTweenRef.current?.kill();

        interactionTweenRef.current =
            gsap.to(
                interactionTargetRef.current,
                {
                    x: 0,
                    y: 0,
                    duration: 0.9,
                    ease: "power3.out",
                }
            );

        gsap.to(
            displacement.sprite,
            {
                rotation: 0,
                duration: 1.1,
                ease: "power3.out",
            }
        );

        startRendering();
    };

    const pushInteraction = (
        velocity: number,
        xDirection: number,
        yDirection: number
    ) => {

        const displacement =
            displacementRef.current;

        if (
            !displacement ||
            isTransitioningRef.current
        ) {
            return;
        }

        const isMobile =
            window.matchMedia(
                "(max-width: 768px)"
            ).matches;

        const maximum =
            isMobile
                ? 42
                : 58;

        const strength =
            Math.min(
                maximum,
                Math.max(
                    0,
                    velocity *
                    (isMobile ? 1.8 : 2.2)
                )
            );

        interactionTargetRef.current.x =
            xDirection *
            strength;

        interactionTargetRef.current.y =
            yDirection *
            strength;

        startRendering();
    };

    const createRipple = (
        x: number,
        y: number
    ) => {

        const displacement =
            displacementRef.current;

        const container =
            containerRef.current;

        if (
            !displacement ||
            !container ||
            isTransitioningRef.current
        ) {
            return;
        }

        const isMobile =
            window.matchMedia(
                "(max-width: 768px)"
            ).matches;

        const strength =
            isMobile
                ? 85
                : 115;

        const angle =
            Math.atan2(
                y - 0.5,
                x - 0.5
            );

        displacement.sprite.position.set(
            x * container.clientWidth,
            y * container.clientHeight
        );

        interactionTweenRef.current?.kill();

        gsap.killTweensOf(
            interactionTargetRef.current
        );

        interactionTargetRef.current.x =
            Math.cos(angle) *
            strength;

        interactionTargetRef.current.y =
            Math.sin(angle) *
            strength;

        gsap.to(
            interactionTargetRef.current,
            {
                x: 0,
                y: 0,
                duration: 1.01,
                ease: "elastic.out(1, 0.55)",
            }
        );

        gsap.to(
            displacement.sprite,
            {
                rotation:
                    displacement.sprite.rotation +
                    Math.PI *
                    (
                        Math.random() > 0.5
                            ? 0.3
                            : -0.3
                    ),
                duration: 0.9,
                ease: "power3.out",
            }
        );

        startRendering();
    };

    useEffect(() => {

        directionRef.current =
            direction;

    }, [
        direction,
    ]);

    useEffect(() => {

        let cancelled =
            false;

        let resizeObserver:
            ResizeObserver | null =
            null;

        const container =
            containerRef.current;

        if (!container) {
            return;
        }

        const initialize =
            async () => {

                const isMobile =
                    window.matchMedia(
                        "(max-width: 768px)"
                    ).matches;

                const app =
                    new Application();

                await app.init({

                    resizeTo:
                        container,

                    backgroundAlpha:
                        0,

                    antialias:
                        true,

                    autoDensity:
                        true,

                    resolution:
                        isMobile
                            ? 1
                            : Math.min(
                                window.devicePixelRatio ||
                                    1,
                                1.25
                            ),

                    powerPreference:
                        isMobile
                            ? "low-power"
                            : "high-performance",
                });

                if (cancelled) {

                    app.destroy(
                        true
                    );

                    return;
                }

                /*
                 * No need to continuously render while
                 * the initial image is downloading.
                 */
                app.ticker.stop();

                container.appendChild(
                    app.canvas
                );

                appRef.current =
                    app;

                const scene =
                    new Container();

                sceneRef.current =
                    scene;

                app.stage.addChild(
                    scene
                );

                const imageLayer =
                    new Container();

                imageLayerRef.current =
                    imageLayer;

                scene.addChild(
                    imageLayer
                );

                const displacementTexture =
                    createDisplacementMap();

                const displacementSprite =
                    new Sprite(
                        displacementTexture
                    );

                displacementSprite.alpha =
                    0;

                scene.addChild(
                    displacementSprite
                );

                const displacementFilter =
                    new DisplacementFilter({
                        sprite:
                            displacementSprite,

                        scale: {
                            x: 0,
                            y: 0,
                        },
                    });

                imageLayer.filters = [
                    displacementFilter,
                ];

                displacementRef.current = {
                    sprite:
                        displacementSprite,

                    filter:
                        displacementFilter,
                };

                /*
                 * Lightweight interaction renderer.
                 *
                 * It only runs while interaction or a
                 * transition is actually happening.
                 */
                app.ticker.add(() => {

                    const displacement =
                        displacementRef.current;

                    if (!displacement) {
                        return;
                    }

                    if (
                        isTransitioningRef.current
                    ) {
                        return;
                    }

                    const current =
                        interactionCurrentRef.current;

                    const target =
                        interactionTargetRef.current;

                    current.x +=
                        (
                            target.x -
                            current.x
                        ) *
                        0.18;

                    current.y +=
                        (
                            target.y -
                            current.y
                        ) *
                        0.18;

                    displacement.filter.scale.x =
                        current.x;

                    displacement.filter.scale.y =
                        current.y;

                    const settled =
                        Math.abs(
                            current.x
                        ) +
                        Math.abs(
                            current.y
                        ) <
                        0.08 &&
                        Math.abs(
                            target.x
                        ) +
                        Math.abs(
                            target.y
                        ) <
                        0.08;

                    if (settled) {

                        current.x =
                            0;

                        current.y =
                            0;

                        target.x =
                            0;

                        target.y =
                            0;

                        displacement.filter.scale.x =
                            0;

                        displacement.filter.scale.y =
                            0;

                        app.ticker.stop();
                    }
                });

                const initialImage =
                    getResponsiveImage();

                const texture =
                    await loadTexture(
                        initialImage
                    );

                if (cancelled) {

                    app.destroy(
                        true
                    );

                    return;
                }

                const sprite =
                    new Sprite(
                        texture
                    );

                sprite.anchor.set(
                    0.5
                );

                imageLayer.addChild(
                    sprite
                );

                const baseScale =
                    fitSprite(
                        sprite,
                        texture,
                        container.clientWidth,
                        container.clientHeight
                    );

                currentRef.current = {
                    sprite,
                    texture,
                    baseScale,
                };

                currentImageRef.current =
                    initialImage;

                resizeScene();

                resizeObserver =
                    new ResizeObserver(
                        () => {
                            resizeScene();
                        }
                    );

                resizeObserver.observe(
                    container
                );

                initializedRef.current =
                    true;

                startRendering();
            };

        void initialize().catch(
            error => {

                if (!cancelled) {

                    console.error(
                        "LiquidTransition initialization error:",
                        error
                    );
                }
            }
        );

        const handleVisibilityChange =
            () => {

                const app =
                    appRef.current;

                if (!app) {
                    return;
                }

                if (document.hidden) {

                    isPageVisibleRef.current =
                        false;

                    app.ticker.stop();

                    return;
                }

                isPageVisibleRef.current =
                    true;

                const target =
                    interactionTargetRef.current;

                const current =
                    interactionCurrentRef.current;

                if (
                    isTransitioningRef.current ||
                    pointerRef.current.down ||
                    Math.abs(target.x) +
                        Math.abs(target.y) >
                        0.08 ||
                    Math.abs(current.x) +
                        Math.abs(current.y) >
                        0.08
                ) {
                    startRendering();
                }
            };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {

            cancelled =
                true;

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            resizeObserver?.disconnect();

            resizeObserver =
                null;

            transitionRef.current?.kill();

            transitionRef.current =
                null;

            interactionTweenRef.current?.kill();

            interactionTweenRef.current =
                null;

            initializedRef.current =
                false;

            isTransitioningRef.current =
                false;

            interactionTargetRef.current.x =
                0;

            interactionTargetRef.current.y =
                0;

            interactionCurrentRef.current.x =
                0;

            interactionCurrentRef.current.y =
                0;

            displacementRef.current =
                null;

            currentRef.current =
                null;

            imageLayerRef.current =
                null;

            sceneRef.current =
                null;

            if (appRef.current) {

                const app =
                    appRef.current;

                appRef.current =
                    null;

                app.destroy(
                    true,
                    {
                        children:
                            true,
                    }
                );
            }
        };

    }, []);

    useEffect(() => {

        const container =
            containerRef.current;

        if (!container) {
            return;
        }

        const updatePointer = (
            clientX: number,
            clientY: number
        ) => {

            const rect =
                container.getBoundingClientRect();

            const x =
                Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            clientX -
                            rect.left
                        ) /
                        rect.width
                    )
                );

            const y =
                Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            clientY -
                            rect.top
                        ) /
                        rect.height
                    )
                );

            const pointer =
                pointerRef.current;

            const dx =
                x -
                pointer.previousX;

            const dy =
                y -
                pointer.previousY;

            const velocity =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                ) * 100;

            pointer.x =
                x;

            pointer.y =
                y;

            pointer.velocity =
                velocity;

            pointer.previousX =
                x;

            pointer.previousY =
                y;

            if (
                pointer.down
            ) {

                pushInteraction(
                    velocity,
                    dx * 10,
                    dy * 10
                );

            } else if (
                velocity > 0.7
            ) {

                pushInteraction(
                    velocity * 0.35,
                    dx * 4,
                    dy * 4
                );
            }
        };

        const handlePointerMove = (
            event: PointerEvent
        ) => {

            updatePointer(
                event.clientX,
                event.clientY
            );
        };

        const handlePointerDown = (
            event: PointerEvent
        ) => {

            pointerRef.current.down =
                true;

            updatePointer(
                event.clientX,
                event.clientY
            );

            createRipple(
                pointerRef.current.x,
                pointerRef.current.y
            );

            try {

                container.setPointerCapture(
                    event.pointerId
                );

            } catch {
                // Pointer capture is optional.
            }
        };

        const handlePointerUp = () => {

            pointerRef.current.down =
                false;

            settleInteraction();
        };

        const handlePointerCancel = () => {

            pointerRef.current.down =
                false;

            settleInteraction();
        };

        const handlePointerLeave = () => {

            if (
                !pointerRef.current.down
            ) {

                settleInteraction();
            }
        };

        container.addEventListener(
            "pointermove",
            handlePointerMove
        );

        container.addEventListener(
            "pointerdown",
            handlePointerDown
        );

        container.addEventListener(
            "pointerup",
            handlePointerUp
        );

        container.addEventListener(
            "pointercancel",
            handlePointerCancel
        );

        container.addEventListener(
            "pointerleave",
            handlePointerLeave
        );

        return () => {

            container.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            container.removeEventListener(
                "pointerdown",
                handlePointerDown
            );

            container.removeEventListener(
                "pointerup",
                handlePointerUp
            );

            container.removeEventListener(
                "pointercancel",
                handlePointerCancel
            );

            container.removeEventListener(
                "pointerleave",
                handlePointerLeave
            );
        };

    }, []);

    useEffect(() => {

        if (
            !initializedRef.current
        ) {
            return;
        }

        const nextImage =
            getResponsiveImage();

        if (
            currentImageRef.current ===
            nextImage
        ) {
            return;
        }

        let cancelled =
            false;

        const transitionToNextImage =
            async () => {

                const imageLayer =
                    imageLayerRef.current;

                const current =
                    currentRef.current;

                const displacement =
                    displacementRef.current;

                const container =
                    containerRef.current;

                const app =
                    appRef.current;

                if (
                    !imageLayer ||
                    !current ||
                    !displacement ||
                    !container ||
                    !app
                ) {
                    return;
                }

                let texture:
                    Texture;

                try {

                    texture =
                        await loadTexture(
                            nextImage
                        );

                } catch (error) {

                    console.error(
                        "LiquidTransition image load error:",
                        error
                    );

                    return;
                }

                if (cancelled) {
                    return;
                }

                isTransitioningRef.current =
                    true;

                interactionTargetRef.current.x =
                    0;

                interactionTargetRef.current.y =
                    0;

                interactionCurrentRef.current.x =
                    0;

                interactionCurrentRef.current.y =
                    0;

                startRendering();

                const incoming =
                    new Sprite(
                        texture
                    );

                incoming.anchor.set(
                    0.5
                );

                incoming.alpha =
                    0;

                imageLayer.addChild(
                    incoming
                );

                const incomingBaseScale =
                    fitSprite(
                        incoming,
                        texture,
                        container.clientWidth,
                        container.clientHeight
                    );

                /*
                 * Preserve the actual fitted scale.
                 *
                 * We animate relative to this value
                 * instead of using unsupported GSAP
                 * scaleX / scaleY properties.
                 */
                incoming.scale.x =
                    incomingBaseScale *
                    1.06;

                incoming.scale.y =
                    incomingBaseScale *
                    1.06;

                transitionRef.current?.kill();

                const isNext =
                    directionRef.current ===
                    "next";

                const directionX =
                    isNext
                        ? 1
                        : -1;

                incoming.position.x +=
                    directionX *
                    container.clientWidth *
                    0.035;

                current.sprite.alpha =
                    1;

                displacement.sprite.alpha =
                    1;

                displacement.sprite.position.set(
                    container.clientWidth / 2,
                    container.clientHeight / 2
                );

                displacement.filter.scale.x =
                    directionX * 18;

                displacement.filter.scale.y =
                    10;

                const timeline =
                    gsap.timeline({
                        onComplete: () => {

                            if (cancelled) {
                                return;
                            }

                            current.sprite.destroy();

                            currentRef.current = {
                                sprite:
                                    incoming,

                                texture,

                                baseScale:
                                    incomingBaseScale,
                            };

                            currentImageRef.current =
                                nextImage;

                            incoming.alpha =
                                1;

                            incoming.scale.set(
                                incomingBaseScale
                            );

                            incoming.position.set(
                                container.clientWidth / 2,
                                container.clientHeight / 2
                            );

                            displacement.filter.scale.x =
                                0;

                            displacement.filter.scale.y =
                                0;

                            displacement.sprite.alpha =
                                0;

                            displacement.sprite.position.set(
                                container.clientWidth / 2,
                                container.clientHeight / 2
                            );

                            transitionRef.current =
                                null;

                            isTransitioningRef.current =
                                false;

                            startRendering();
                        },
                    });

                transitionRef.current =
                    timeline;

                timeline

                    .to(
                        displacement.filter.scale,
                        {
                            x:
                                directionX *
                                110,

                            y:
                                58,

                            duration:
                                0.28,

                            ease:
                                "power3.in",
                        },
                        0
                    )

                    .to(
                        incoming,
                        {
                            alpha:
                                1,

                            x:
                                container.clientWidth /
                                2,

                            duration:
                                0.72,

                            ease:
                                "power3.out",
                        },
                        0.12
                    )

                    .to(
                        incoming.scale,
                        {
                            x:
                                incomingBaseScale,

                            y:
                                incomingBaseScale,

                            duration:
                                0.72,

                            ease:
                                "power3.out",
                        },
                        0.12
                    )

                    .to(
                        current.sprite,
                        {
                            x:
                                container.clientWidth /
                                2 -
                                directionX *
                                container.clientWidth *
                                0.08,

                            duration:
                                0.58,

                            ease:
                                "power3.in",
                        },
                        0
                    )

                    .to(
                        current.sprite.scale,
                        {
                            x:
                                current.baseScale *
                                1.035,

                            y:
                                current.baseScale *
                                1.035,

                            duration:
                                0.58,

                            ease:
                                "power3.in",
                        },
                        0
                    )

                    .to(
                        displacement.filter.scale,
                        {
                            x:
                                directionX *
                                155,

                            y:
                                -75,

                            duration:
                                0.36,

                            ease:
                                "power2.inOut",
                        },
                        0.28
                    )

                    .to(
                        displacement.sprite,
                        {
                            rotation:
                                directionX *
                                Math.PI *
                                0.55,

                            duration:
                                0.82,

                            ease:
                                "power2.inOut",
                        },
                        0
                    )

                    .to(
                        displacement.filter.scale,
                        {
                            x:
                                directionX *
                                42,

                            y:
                                18,

                            duration:
                                0.42,

                            ease:
                                "power3.out",
                        },
                        0.62
                    )

                    .to(
                        displacement.filter.scale,
                        {
                            x: 0,
                            y: 0,

                            duration:
                                0.55,

                            ease:
                                "power3.inOut",
                        },
                        0.92
                    )

                    .to(
                        displacement.sprite,
                        {
                            rotation: 0,

                            duration:
                                0.7,

                            ease:
                                "power3.out",
                        },
                        0.88
                    );
            };

        void transitionToNextImage();

        return () => {

            cancelled =
                true;
        };

    }, [
        desktopImage,
        mobileImage,
    ]);

    return (
        <div
            ref={containerRef}
            className="liquid-transition"
            aria-hidden="true"
        />
    );
}