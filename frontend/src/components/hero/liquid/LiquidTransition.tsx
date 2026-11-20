import { useEffect, useRef } from "react";
import {
    Application,
    Container,
    DisplacementFilter,
    Rectangle,
    Sprite,
    Texture,
} from "pixi.js";
import { gsap } from "gsap";
import "./LiquidTransition.css";

type HeroDirection = "next" | "previous";

type PreloadItem = { desktop: string; mobile: string };

type LiquidTransitionProps = {
    desktopImage: string;
    mobileImage: string;
    direction: HeroDirection;
    /** Other slides, so their textures are ready before you click. */
    preload?: PreloadItem[];
};

type LoadedImage = { sprite: Sprite; baseScale: number };

const MOBILE_QUERY = "(max-width: 768px)";

/* Slight overscan so displacement never reveals the edges */
const OVERSCAN = 1.04;

const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

function fitSprite(sprite: Sprite, texture: Texture, w: number, h: number) {
    if (w <= 0 || h <= 0 || texture.width <= 0 || texture.height <= 0) return 1;
    const scale = Math.max(w / texture.width, h / texture.height) * OVERSCAN;
    sprite.scale.set(scale);
    sprite.position.set(w / 2, h / 2);
    return scale;
}

function createDisplacementTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create displacement canvas.");

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const clamp = (v: number) => Math.max(0, Math.min(255, v));

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const nx = x / size;
            const ny = y / size;

            const waveX = Math.sin(nx * 18 + Math.sin(ny * 9) * 4);
            const waveY = Math.cos(ny * 16 + Math.sin(nx * 11) * 5);
            const detailX = Math.sin(nx * 42 + ny * 15);
            const detailY = Math.cos(ny * 38 - nx * 17);
            const ripple = Math.sin(Math.hypot(nx - 0.5, ny - 0.5) * 42);

            data[i] = clamp(128 + waveX * 38 + detailX * 16 + ripple * 18);
            data[i + 1] = clamp(128 + waveY * 38 + detailY * 16 + ripple * 14);
            data[i + 2] = 128;
            data[i + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return Texture.from(canvas);
}

export default function LiquidTransition({
    desktopImage,
    mobileImage,
    direction,
    preload,
}: LiquidTransitionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const layerRef = useRef<Container | null>(null);
    const currentRef = useRef<LoadedImage | null>(null);
    const dispRef = useRef<{ sprite: Sprite; filter: DisplacementFilter } | null>(null);

    const cacheRef = useRef(new Map<string, Promise<Texture>>());

    const currentSrcRef = useRef(""); // what is fully shown
    const targetSrcRef = useRef(""); // what the latest transition is heading to
    const pendingSrcRef = useRef(""); // what is currently downloading

    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const finalizeRef = useRef<(() => void) | null>(null);

    const aliveRef = useRef(false);
    const readyRef = useRef(false);
    const dirtyRef = useRef(true);
    const wasBusyRef = useRef(false);
    const transitioningRef = useRef(false);

    const fxTarget = useRef({ x: 0, y: 0 });
    const fxCurrent = useRef({ x: 0, y: 0 });

    const pointerRef = useRef({ x: 0.5, y: 0.5, previousX: 0.5, previousY: 0.5, down: false });

    /* Always-fresh props for async code */
    const directionRef = useRef(direction);
    const propsRef = useRef({ desktopImage, mobileImage, preload });
    directionRef.current = direction;
    propsRef.current = { desktopImage, mobileImage, preload };

    const wantedSrc = () =>
        isMobile() ? propsRef.current.mobileImage : propsRef.current.desktopImage;

    /* ------------------------------------------------------------ */
    /* Texture cache                                                */
    /* ------------------------------------------------------------ */

    const loadTexture = (src: string): Promise<Texture> => {
        const cache = cacheRef.current;
        let promise = cache.get(src);

        if (!promise) {
            promise = (async () => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.decoding = "async";
                img.src = src;

                // Decode off the main thread BEFORE we need it.
                await img.decode();

                const texture = Texture.from(img);

                // Upload to the GPU now instead of hitching mid-transition.
                try {
                    (
                        appRef.current?.renderer.texture as unknown as
                            | { initSource?: (source: unknown) => void }
                            | undefined
                    )?.initSource?.(texture.source);
                } catch {
                    /* optional optimisation */
                }

                return texture;
            })();

            const created = promise;
            created.catch(() => {
                if (cache.get(src) === created) cache.delete(src);
            });

            cache.set(src, created);
        }

        return promise;
    };

    const prune = () => {
        const keep = new Set<string>([
            currentSrcRef.current,
            targetSrcRef.current,
            pendingSrcRef.current,
        ]);

        const mobile = isMobile();
        (propsRef.current.preload ?? []).forEach((item) => {
            keep.add(mobile ? item.mobile : item.desktop);
        });

        cacheRef.current.forEach((promise, src) => {
            if (keep.has(src)) return;
            cacheRef.current.delete(src);
            promise.then((t) => t.destroy(true)).catch(() => {});
        });
    };

    /* ------------------------------------------------------------ */
    /* Layout                                                       */
    /* ------------------------------------------------------------ */

    const layout = () => {
        const app = appRef.current;
        const container = containerRef.current;
        const layer = layerRef.current;
        const disp = dispRef.current;

        if (!app || !container || !layer || !disp) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;

        app.renderer.resize(w, h);

        // Fixed filter area = no per-frame bounds calculation.
        layer.filterArea = new Rectangle(0, 0, w, h);

        const size = Math.max(w, h) * 1.3;
        disp.sprite.width = size;
        disp.sprite.height = size;

        if (!transitioningRef.current) {
            disp.sprite.position.set(w / 2, h / 2);

            const cur = currentRef.current;
            if (cur) {
                cur.baseScale = fitSprite(cur.sprite, cur.sprite.texture, w, h);
            }
        }

        dirtyRef.current = true;
    };

    /* ------------------------------------------------------------ */
    /* Interaction                                                  */
    /* ------------------------------------------------------------ */

    const settleInteraction = () => {
        const disp = dispRef.current;
        if (!disp) return;

        gsap.to(fxTarget.current, { x: 0, y: 0, duration: 0.9, ease: "power3.out", overwrite: true });
        gsap.to(disp.sprite, { rotation: 0, duration: 1.1, ease: "power3.out", overwrite: true });
    };

    const pushInteraction = (velocity: number, xDir: number, yDir: number) => {
        if (!dispRef.current || transitioningRef.current) return;

        const mobile = isMobile();
        const maximum = mobile ? 42 : 58;
        const strength = Math.min(maximum, Math.max(0, velocity * (mobile ? 1.8 : 2.2)));

        fxTarget.current.x = xDir * strength;
        fxTarget.current.y = yDir * strength;
    };

    const createRipple = (x: number, y: number) => {
        const disp = dispRef.current;
        const container = containerRef.current;
        if (!disp || !container || transitioningRef.current) return;

        const strength = isMobile() ? 85 : 115;
        const angle = Math.atan2(y - 0.5, x - 0.5);

        disp.sprite.position.set(x * container.clientWidth, y * container.clientHeight);

        gsap.killTweensOf(fxTarget.current);
        gsap.killTweensOf(disp.sprite);

        fxTarget.current.x = Math.cos(angle) * strength;
        fxTarget.current.y = Math.sin(angle) * strength;

        gsap.to(fxTarget.current, {
            x: 0,
            y: 0,
            duration: 0.9,
            ease: "elastic.out(1, 0.55)",
        });

        gsap.to(disp.sprite, {
            rotation: disp.sprite.rotation + Math.PI * (Math.random() > 0.5 ? 0.3 : -0.3),
            duration: 0.9,
            ease: "power3.out",
        });
    };

    /* ------------------------------------------------------------ */
    /* Transition                                                   */
    /* ------------------------------------------------------------ */

    const runTransition = (src: string, texture: Texture) => {
        const container = containerRef.current;
        const layer = layerRef.current;
        const disp = dispRef.current;
        if (!container || !layer || !disp) return;

        targetSrcRef.current = src;

        /*
         * Rapid clicking: instantly finish whatever is running,
         * then start the new transition from a clean state.
         */
        if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
        }
        finalizeRef.current?.();

        const current = currentRef.current;
        if (!current) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        const dir = directionRef.current === "next" ? 1 : -1;

        gsap.killTweensOf([fxTarget.current, disp.sprite, disp.filter.scale]);
        fxTarget.current.x = fxTarget.current.y = 0;
        fxCurrent.current.x = fxCurrent.current.y = 0;
        disp.filter.scale.x = 0;
        disp.filter.scale.y = 0;
        disp.sprite.rotation = 0;
        disp.sprite.position.set(w / 2, h / 2);

        const incoming = new Sprite(texture);
        incoming.anchor.set(0.5);
        incoming.alpha = 0;
        layer.addChild(incoming);

        const base = fitSprite(incoming, texture, w, h);
        incoming.scale.set(base * 1.06);
        incoming.x += dir * w * 0.035;

        transitioningRef.current = true;
        dirtyRef.current = true;

        const finalize = () => {
            if (finalizeRef.current !== finalize) return;
            finalizeRef.current = null;
            timelineRef.current = null;

            current.sprite.destroy();

            const cw = container.clientWidth;
            const ch = container.clientHeight;

            incoming.alpha = 1;
            const scale = fitSprite(incoming, texture, cw, ch);

            currentRef.current = { sprite: incoming, baseScale: scale };
            currentSrcRef.current = src;

            disp.filter.scale.x = 0;
            disp.filter.scale.y = 0;
            disp.sprite.rotation = 0;
            disp.sprite.position.set(cw / 2, ch / 2);

            transitioningRef.current = false;
            dirtyRef.current = true;

            prune();
        };

        finalizeRef.current = finalize;

        const tl = gsap.timeline({ onComplete: finalize });
        timelineRef.current = tl;

        tl
            /* distortion peaks fast, relaxes */
            .to(disp.filter.scale, { x: dir * 80, y: 38, duration: 0.16, ease: "power2.in" }, 0)
            .to(disp.filter.scale, { x: 0, y: 0, duration: 0.4, ease: "power3.out" }, 0.16)

            /* incoming image appears almost immediately */
            .to(incoming, { alpha: 1, duration: 0.18, ease: "none" }, 0.04)
            .to(incoming, { x: w / 2, duration: 0.5, ease: "power3.out" }, 0)
            .to(incoming.scale, { x: base, y: base, duration: 0.5, ease: "power3.out" }, 0)

            /* outgoing image */
            .to(current.sprite, { x: w / 2 - dir * w * 0.05, duration: 0.3, ease: "power2.in" }, 0)
            .to(
                current.sprite.scale,
                {
                    x: current.baseScale * 1.03,
                    y: current.baseScale * 1.03,
                    duration: 0.3,
                    ease: "power2.in",
                },
                0
            )

            /* swirl */
            .to(disp.sprite, { rotation: dir * Math.PI * 0.3, duration: 0.56, ease: "power2.inOut" }, 0);
    };

    const goTo = async (src: string) => {
        if (!readyRef.current) return; // init will pick up the latest image itself

        pendingSrcRef.current = src === targetSrcRef.current ? "" : src;
        if (!pendingSrcRef.current) return;

        // Start the liquid wobble immediately; the swap happens once the texture is ready.
        if (!transitioningRef.current) {
            const dir = directionRef.current === "next" ? 1 : -1;
            fxTarget.current.x = dir * 60;
            fxTarget.current.y = 25;
            dirtyRef.current = true;
        }

        let texture: Texture;

        try {
            texture = await loadTexture(src);
        } catch (error) {
            if (pendingSrcRef.current === src) pendingSrcRef.current = "";
            fxTarget.current.x = 0;
            fxTarget.current.y = 0;
            console.error("LiquidTransition image load error:", error);
            return;
        }

        // Unmounted, or the user already asked for something newer.
        if (!aliveRef.current || pendingSrcRef.current !== src) return;

        pendingSrcRef.current = "";
        runTransition(src, texture);
    };

    /* ------------------------------------------------------------ */
    /* Init / teardown                                              */
    /* ------------------------------------------------------------ */

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        let resizeObserver: ResizeObserver | null = null;

        aliveRef.current = true;

        /*
         * Single render loop, driven by GSAP so tweens and drawing
         * are always in the same frame. Only draws when needed.
         */
        const tick = () => {
            const app = appRef.current;
            const disp = dispRef.current;
            if (!app || !disp || !readyRef.current) return;

            let busy = transitioningRef.current;

            if (!busy) {
                const c = fxCurrent.current;
                const t = fxTarget.current;

                c.x += (t.x - c.x) * 0.18;
                c.y += (t.y - c.y) * 0.18;

                disp.filter.scale.x = c.x;
                disp.filter.scale.y = c.y;

                const tweening = gsap.isTweening(t) || gsap.isTweening(disp.sprite);
                const settled =
                    Math.abs(c.x) + Math.abs(c.y) < 0.08 &&
                    Math.abs(t.x) + Math.abs(t.y) < 0.08;

                if (settled && (c.x || c.y || t.x || t.y)) {
                    c.x = c.y = t.x = t.y = 0;
                    disp.filter.scale.x = 0;
                    disp.filter.scale.y = 0;
                    dirtyRef.current = true;
                }

                busy = tweening || !settled;
            }

            // +1 trailing frame so the final resting state always gets drawn
            if (busy || wasBusyRef.current || dirtyRef.current) {
                dirtyRef.current = false;
                app.render();
            }

            wasBusyRef.current = busy;
        };

        gsap.ticker.add(tick);

        const initialize = async () => {
            const mobile = isMobile();
            const app = new Application();

            await app.init({
                width: container.clientWidth || 1,
                height: container.clientHeight || 1,
                backgroundAlpha: 0,
                antialias: false, // images don't need MSAA, saves fill rate
                autoDensity: true,
                autoStart: false, // GSAP drives rendering
                resolution: mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.25),
                powerPreference: mobile ? "low-power" : "high-performance",
            });

            if (cancelled) {
                app.destroy(true);
                return;
            }

            container.appendChild(app.canvas);
            appRef.current = app;

            /*
             * The displacement sprite lives BEHIND the images so it can
             * never be seen, but still feeds the filter.
             */
            const dispSprite = new Sprite(createDisplacementTexture());
            dispSprite.anchor.set(0.5);
            app.stage.addChild(dispSprite);

            const layer = new Container();
            layerRef.current = layer;
            app.stage.addChild(layer);

            const filter = new DisplacementFilter({
                sprite: dispSprite,
                scale: { x: 0, y: 0 },
            });
            layer.filters = [filter];

            dispRef.current = { sprite: dispSprite, filter };

            // Load whatever is wanted NOW (props may have changed while we initialised)
            const src = wantedSrc();
            const texture = await loadTexture(src);

            if (cancelled) {
                app.destroy(true);
                return;
            }

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            layer.addChild(sprite);

            const baseScale = fitSprite(sprite, texture, container.clientWidth, container.clientHeight);
            currentRef.current = { sprite, baseScale };
            currentSrcRef.current = src;
            targetSrcRef.current = src;

            layout();

            resizeObserver = new ResizeObserver(layout);
            resizeObserver.observe(container);

            readyRef.current = true;
            dirtyRef.current = true;

            // If the slide changed while we were loading, go there now.
            void goTo(wantedSrc());
        };

        void initialize().catch((error) => {
            if (!cancelled) console.error("LiquidTransition initialization error:", error);
        });

        return () => {
            cancelled = true;
            aliveRef.current = false;
            readyRef.current = false;

            gsap.ticker.remove(tick);
            resizeObserver?.disconnect();

            timelineRef.current?.kill();
            timelineRef.current = null;
            finalizeRef.current = null;

            const disp = dispRef.current;
            gsap.killTweensOf(fxTarget.current);
            if (disp) gsap.killTweensOf([disp.sprite, disp.filter.scale]);

            transitioningRef.current = false;
            fxTarget.current.x = fxTarget.current.y = 0;
            fxCurrent.current.x = fxCurrent.current.y = 0;

            dispRef.current = null;
            currentRef.current = null;
            layerRef.current = null;

            const app = appRef.current;
            appRef.current = null;
            app?.destroy(true, { children: true });

            cacheRef.current.forEach((p) => p.then((t) => t.destroy(true)).catch(() => {}));
            cacheRef.current.clear();

            currentSrcRef.current = "";
            targetSrcRef.current = "";
            pendingSrcRef.current = "";
        };
    }, []);

    /* ------------------------------------------------------------ */
    /* React to slide / breakpoint changes                          */
    /* ------------------------------------------------------------ */

    useEffect(() => {
        void goTo(wantedSrc());
    }, [desktopImage, mobileImage]);

    useEffect(() => {
        const mq = window.matchMedia(MOBILE_QUERY);
        const onChange = () => void goTo(wantedSrc());
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    /* ------------------------------------------------------------ */
    /* Preload other slides so "next" starts instantly              */
    /* ------------------------------------------------------------ */

    const preloadKey = (preload ?? []).map((p) => `${p.desktop}|${p.mobile}`).join(",");

    useEffect(() => {
        const mobile = isMobile();
        (propsRef.current.preload ?? []).forEach((item) => {
            loadTexture(mobile ? item.mobile : item.desktop).catch(() => {});
        });
    }, [preloadKey]);

    /* ------------------------------------------------------------ */
    /* Pointer                                                      */
    /* ------------------------------------------------------------ */

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

        const updatePointer = (clientX: number, clientY: number) => {
            const rect = container.getBoundingClientRect();
            const x = clamp01((clientX - rect.left) / rect.width);
            const y = clamp01((clientY - rect.top) / rect.height);

            const p = pointerRef.current;
            const dx = x - p.previousX;
            const dy = y - p.previousY;
            const velocity = Math.hypot(dx, dy) * 100;

            p.x = x;
            p.y = y;
            p.previousX = x;
            p.previousY = y;

            if (p.down) {
                pushInteraction(velocity, dx * 10, dy * 10);
            } else if (velocity > 0.7) {
                pushInteraction(velocity * 0.35, dx * 4, dy * 4);
            }
        };

        const onMove = (e: PointerEvent) => updatePointer(e.clientX, e.clientY);

        const onDown = (e: PointerEvent) => {
            pointerRef.current.down = true;
            updatePointer(e.clientX, e.clientY);
            createRipple(pointerRef.current.x, pointerRef.current.y);

            try {
                container.setPointerCapture(e.pointerId);
            } catch {
                /* optional */
            }
        };

        const onUp = () => {
            pointerRef.current.down = false;
            settleInteraction();
        };

        const onLeave = () => {
            if (!pointerRef.current.down) settleInteraction();
        };

        container.addEventListener("pointermove", onMove);
        container.addEventListener("pointerdown", onDown);
        container.addEventListener("pointerup", onUp);
        container.addEventListener("pointercancel", onUp);
        container.addEventListener("pointerleave", onLeave);

        return () => {
            container.removeEventListener("pointermove", onMove);
            container.removeEventListener("pointerdown", onDown);
            container.removeEventListener("pointerup", onUp);
            container.removeEventListener("pointercancel", onUp);
            container.removeEventListener("pointerleave", onLeave);
        };
    }, []);

    return <div ref={containerRef} className="liquid-transition" aria-hidden="true" />;
}