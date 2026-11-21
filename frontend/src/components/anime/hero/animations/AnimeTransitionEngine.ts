
import { API_BASE_URL } from "../../../../services/api/api";

import {
    Application,
    Container,
    DisplacementFilter,
    Graphics,
    Rectangle,
    Sprite,
    Texture,
} from "pixi.js";

import { gsap } from "gsap";

type TransitionDirection = "next" | "previous";

type ImageLayer = {
    sprite: Sprite;
    texture: Texture;
    scale: number;
};

type Fragment = {
    sprite: Sprite;
    texture: Texture;
    targetX: number;
    targetY: number;
};

export default class AnimeTransitionEngine {
    private container: HTMLDivElement;

    private app: Application | null = null;

    private imageLayer = new Container();

    private fragmentLayer = new Container();

    private chromeLayer = new Container();

    private currentImage: ImageLayer | null = null;

    private pendingImage: ImageLayer | null = null;

    private displacementSprite: Sprite | null = null;

    private displacementFilter: DisplacementFilter | null = null;

    private timeline: gsap.core.Timeline | null = null;

    private resizeObserver: ResizeObserver | null = null;

    private fragments: Fragment[] = [];

    private chromeStreaks: Graphics[] = [];

    private initialized = false;

    private destroyed = false;

    private transitioning = false;

    private currentUrl = "";

    private requestId = 0;

    private width = 0;

    private height = 0;

    private reducedMotion = false;

    constructor(container: HTMLDivElement) {
        this.container = container;

        this.reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    async initialize(initialImage: string): Promise<void> {
        if (this.initialized || this.destroyed) return;

        this.width = Math.max(1, this.container.clientWidth);
        this.height = Math.max(1, this.container.clientHeight);

        const app = new Application();

        await app.init({
            width: this.width,
            height: this.height,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(window.devicePixelRatio || 1, 1.5),
            powerPreference: "high-performance",
            preference: "webgl",
        });

        if (this.destroyed) {
            app.destroy();
            return;
        }

        this.app = app;

        this.container.appendChild(app.canvas);

        app.ticker.stop();

        // The displacement map sits behind the actual artwork.
        this.createDisplacement();

        app.stage.addChild(this.imageLayer);
        app.stage.addChild(this.fragmentLayer);
        app.stage.addChild(this.chromeLayer);

        const texture = await this.loadImage(initialImage);

        if (this.destroyed) {
            texture.destroy(true);
            return;
        }

        const sprite = new Sprite(texture);

        sprite.anchor.set(0.5);

        this.imageLayer.addChild(sprite);

        const scale = this.fitImage(sprite, texture);

        this.currentImage = {
            sprite,
            texture,
            scale,
        };

        this.currentUrl = initialImage;

        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });

        this.resizeObserver.observe(this.container);

        this.initialized = true;

        app.render();
    }

    private async loadImage(url: string): Promise<Texture> {
        if (!url) {
            throw new Error("No image URL was provided.");
        }

        const proxyUrl = new URL(
            "/proxy-anime-image",
            API_BASE_URL
        );

        proxyUrl.searchParams.set("url", url);

        const image = new Image();

        image.decoding = "async";
        image.crossOrigin = "anonymous";
        image.src = proxyUrl.toString();

        try {
            await image.decode();

            return Texture.from(image);
        } catch (error) {
            throw new Error(
                `Failed to load Anime image through Wought+ proxy: ${url}`,
                { cause: error }
            );
        }
    }

    private fitImage(sprite: Sprite, texture: Texture): number {
        const scale = Math.max(
            this.width / texture.width,
            this.height / texture.height
        );

        sprite.scale.set(scale);

        sprite.position.set(
            this.width / 2,
            this.height / 2
        );

        return scale;
    }

    // --------------------------------------------------
    // LIQUID CHROME DISPLACEMENT
    // --------------------------------------------------

    private createDisplacement(): void {
        const size = 512;

        const canvas = document.createElement("canvas");

        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
            console.warn(
                "Anime transition: Could not create displacement map."
            );
            return;
        }

        const imageData = context.createImageData(size, size);
        const data = imageData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                const nx = x / size;
                const ny = y / size;

                // Broad liquid waves.
                const waveX =
                    Math.sin(nx * 15 + Math.sin(ny * 7) * 3.5);

                const waveY =
                    Math.cos(ny * 13 + Math.sin(nx * 8) * 4);

                // Fine holographic surface detail.
                const detail =
                    Math.sin(nx * 29 + ny * 19) *
                    Math.cos(ny * 25 - nx * 16);

                // Expanding liquid ripple.
                const radial = Math.sqrt(
                    (nx - 0.5) ** 2 +
                    (ny - 0.5) ** 2
                );

                const ripple = Math.sin(radial * 42);

                data[index] = Math.max(
                    0,
                    Math.min(
                        255,
                        128 + waveX * 48 + detail * 15 + ripple * 18
                    )
                );

                data[index + 1] = Math.max(
                    0,
                    Math.min(
                        255,
                        128 + waveY * 48 - detail * 15 + ripple * 18
                    )
                );

                data[index + 2] = 128;
                data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);

        const displacementTexture = Texture.from(canvas);

        const displacementSprite = new Sprite(displacementTexture);

        displacementSprite.anchor.set(0.5);

        displacementSprite.position.set(
            this.width / 2,
            this.height / 2
        );

        displacementSprite.width = this.width;
        displacementSprite.height = this.height;

        this.displacementSprite = displacementSprite;

        // Keep the map behind the artwork so it cannot obscure it.
        this.app?.stage.addChildAt(displacementSprite, 0);

        try {
            const filter = new DisplacementFilter({
                sprite: displacementSprite,
                scale: 0,
            });

            this.imageLayer.filters = [filter];

            this.displacementFilter = filter;
        } catch (error) {
            console.warn(
                "Anime transition: Displacement filter unavailable. Using fragment transition instead.",
                error
            );

            this.displacementFilter = null;
            this.imageLayer.filters = [];
        }
    }

    // --------------------------------------------------
    // RESPONSIVE RESIZING
    // --------------------------------------------------

    private resize(): void {
        if (!this.app || this.destroyed) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width <= 0 || height <= 0) return;

        this.width = width;
        this.height = height;

        this.app.renderer.resize(width, height);

        if (this.currentImage && !this.transitioning) {
            this.fitImage(
                this.currentImage.sprite,
                this.currentImage.texture
            );
        }

        if (this.displacementSprite) {
            this.displacementSprite.position.set(
                width / 2,
                height / 2
            );

            this.displacementSprite.width = width;
            this.displacementSprite.height = height;
        }

        this.app.render();
    }

    // --------------------------------------------------
    // FRAGMENT SYSTEM
    // --------------------------------------------------

    private clearFragments(): void {
        for (const fragment of this.fragments) {
            this.fragmentLayer.removeChild(fragment.sprite);

            fragment.sprite.destroy();

            fragment.texture.destroy(false);
        }

        this.fragments = [];
    }

    private createFragments(image: ImageLayer): void {
        this.clearFragments();

        // Smaller fragments give the transition a more
        // digital, crystalline appearance.
        const columns = 12;
        const rows = 7;

        const textureWidth = image.texture.width;
        const textureHeight = image.texture.height;

        const cellWidth = textureWidth / columns;
        const cellHeight = textureHeight / rows;

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const x = column * cellWidth;
                const y = row * cellHeight;

                const frameWidth = Math.min(
                    cellWidth + 1,
                    textureWidth - x
                );

                const frameHeight = Math.min(
                    cellHeight + 1,
                    textureHeight - y
                );

                const fragmentTexture = new Texture({
                    source: image.texture.source,
                    frame: new Rectangle(
                        x,
                        y,
                        frameWidth,
                        frameHeight
                    ),
                });

                const sprite = new Sprite(fragmentTexture);

                sprite.anchor.set(0.5);

                sprite.scale.set(image.scale);

                const centerX =
                    (x + frameWidth / 2 - textureWidth / 2) *
                    image.scale;

                const centerY =
                    (y + frameHeight / 2 - textureHeight / 2) *
                    image.scale;

                const targetX = this.width / 2 + centerX;
                const targetY = this.height / 2 + centerY;

                sprite.position.set(targetX, targetY);

                this.fragmentLayer.addChild(sprite);

                this.fragments.push({
                    sprite,
                    texture: fragmentTexture,
                    targetX,
                    targetY,
                });
            }
        }
    }

    // --------------------------------------------------
    // HOLOGRAPHIC CHROME SWEEP
    // --------------------------------------------------

    private clearChromeStreaks(): void {
        for (const streak of this.chromeStreaks) {
            this.chromeLayer.removeChild(streak);
            streak.destroy();
        }

        this.chromeStreaks = [];
    }

    private createChromeStreaks(): void {
        this.clearChromeStreaks();

        const streakColors = [
            0xffffff,
            0x9fffee,
            0xb9a6ff,
            0xe8faff,
        ];

        const streakWidths = [
            0.055,
            0.025,
            0.035,
            0.012,
        ];

        streakColors.forEach((color, index) => {
            const streakWidth = Math.max(
                12,
                this.width * streakWidths[index]
            );

            const streak = new Graphics();

            streak
                .rect(
                    -streakWidth / 2,
                    -this.height,
                    streakWidth,
                    this.height * 2
                )
                .fill({ color });

            streak.position.set(
                -this.width * 0.8 - index * 80,
                this.height / 2
            );

            streak.rotation = -0.16;

            streak.alpha = 0;

            this.chromeLayer.addChild(streak);

            this.chromeStreaks.push(streak);
        });
    }

    private animateChromeSweep(
        timeline: gsap.core.Timeline,
        directionMultiplier: number
    ): void {
        this.createChromeStreaks();

        this.chromeStreaks.forEach((streak, index) => {
            const startX =
                -this.width * 0.8 - index * 80;

            const endX =
                this.width * 1.8 +
                index * 100;

            const delay = index * 0.075;

            timeline
                .set(
                    streak,
                    {
                        x: startX,
                        alpha: 0,
                    },
                    0.18 + delay
                )
                .to(
                    streak,
                    {
                        x: directionMultiplier === 1
                            ? endX
                            : -endX,
                        alpha: index === 0 ? 0.34 : 0.19,
                        duration: 0.8,
                        ease: "power2.inOut",
                    },
                    0.18 + delay
                )
                .to(
                    streak,
                    {
                        alpha: 0,
                        duration: 0.35,
                        ease: "power2.out",
                    },
                    0.72 + delay
                );
        });
    }

    // --------------------------------------------------
    // MAIN TRANSITION
    // --------------------------------------------------

    async transitionTo(
        url: string,
        direction: TransitionDirection
    ): Promise<void> {
        if (
            !this.initialized ||
            this.destroyed ||
            !this.currentImage ||
            !url ||
            url === this.currentUrl
        ) {
            return;
        }

        const thisRequest = ++this.requestId;

        const incomingTexture = await this.loadImage(url);

        // A newer navigation request may have arrived
        // while this image was loading.
        if (
            this.destroyed ||
            thisRequest !== this.requestId
        ) {
            incomingTexture.destroy(true);
            return;
        }

        if (this.reducedMotion) {
            this.showImmediately(incomingTexture, url);
            return;
        }

        this.cancelActiveTransition();

        const outgoing = this.currentImage;

        if (!outgoing) {
            incomingTexture.destroy(true);
            return;
        }

        this.transitioning = true;

        const incomingSprite = new Sprite(incomingTexture);

        incomingSprite.anchor.set(0.5);
        incomingSprite.alpha = 0;

        this.imageLayer.addChild(incomingSprite);

        const incomingScale = this.fitImage(
            incomingSprite,
            incomingTexture
        );

        incomingSprite.scale.set(incomingScale * 1.075);

        this.pendingImage = {
            sprite: incomingSprite,
            texture: incomingTexture,
            scale: incomingScale,
        };

        this.createFragments(outgoing);

        outgoing.sprite.alpha = 0;

        const displacement = this.displacementFilter;
        const displacementSprite = this.displacementSprite;

        if (displacement && displacementSprite) {
            displacementSprite.alpha = 1;

            displacementSprite.position.set(
                this.width / 2,
                this.height / 2
            );
        }

        const directionMultiplier =
            direction === "next" ? 1 : -1;

        const timeline = gsap.timeline({
            onComplete: () => {
                if (this.destroyed) return;

                this.imageLayer.removeChild(outgoing.sprite);
                outgoing.sprite.destroy();
                outgoing.texture.destroy(true);

                this.clearFragments();
                this.clearChromeStreaks();

                incomingSprite.alpha = 1;

                incomingSprite.scale.set(incomingScale);

                incomingSprite.position.set(
                    this.width / 2,
                    this.height / 2
                );

                this.currentImage = {
                    sprite: incomingSprite,
                    texture: incomingTexture,
                    scale: incomingScale,
                };

                this.pendingImage = null;

                this.currentUrl = url;

                if (displacement) {
                    displacement.scale.set(0, 0);
                }

                if (displacementSprite) {
                    displacementSprite.alpha = 0;
                    displacementSprite.rotation = 0;
                }

                this.transitioning = false;
                this.timeline = null;

                this.app?.render();
                this.app?.ticker.stop();
            },
        });

        this.timeline = timeline;

        this.app?.ticker.start();

        // Liquid chrome distortion.
        if (displacement) {
            timeline
                .to(
                    displacement.scale,
                    {
                        x: directionMultiplier * 115,
                        y: 75,
                        duration: 0.62,
                        ease: "power3.inOut",
                    },
                    0
                )
                .to(
                    displacement.scale,
                    {
                        x: directionMultiplier * 165,
                        y: -95,
                        duration: 0.48,
                        ease: "power2.inOut",
                    },
                    0.4
                )
                .to(
                    displacement.scale,
                    {
                        x: 0,
                        y: 0,
                        duration: 0.7,
                        ease: "power3.out",
                    },
                    1.05
                );
        }

        if (displacementSprite) {
            timeline.to(
                displacementSprite,
                {
                    rotation: directionMultiplier * Math.PI * 0.5,
                    duration: 1.15,
                    ease: "power2.inOut",
                },
                0
            );
        }

        // Incoming image reveal.
        timeline
            .to(
                incomingSprite,
                {
                    alpha: 1,
                    duration: 0.9,
                    ease: "power2.out",
                },
                0.34
            )
            .to(
                incomingSprite.scale,
                {
                    x: incomingScale,
                    y: incomingScale,
                    duration: 1.2,
                    ease: "power3.out",
                },
                0.2
            );

        // Holographic sweep across the transition.
        this.animateChromeSweep(
            timeline,
            directionMultiplier
        );

        // Digital fragments disperse from the outgoing image.
        for (const fragment of this.fragments) {
            const random = Math.random();

            const scatterX =
                (random - 0.5) *
                this.width *
                0.7;

            const scatterY =
                (Math.random() - 0.5) *
                this.height *
                0.65;

            const rotation =
                (Math.random() - 0.5) *
                Math.PI *
                1.25;

            const delay = Math.random() * 0.3;

            timeline
                .to(
                    fragment.sprite,
                    {
                        x:
                            fragment.targetX +
                            scatterX +
                            directionMultiplier * this.width * 0.1,
                        y: fragment.targetY + scatterY,
                        rotation,
                        alpha: 0,
                        duration: 0.9 + Math.random() * 0.25,
                        ease: "power3.in",
                    },
                    0.03 + delay
                )
                .to(
                    fragment.sprite.scale,
                    {
                        x: outgoing.scale * 0.68,
                        y: outgoing.scale * 0.68,
                        duration: 0.9,
                        ease: "power2.in",
                    },
                    0.03 + delay
                );
        }
    }

    // --------------------------------------------------
    // INSTANT IMAGE CHANGE
    // --------------------------------------------------

    private showImmediately(texture: Texture, url: string): void {
        this.cancelActiveTransition();

        if (!this.currentImage) {
            texture.destroy(true);
            return;
        }

        const previous = this.currentImage;

        this.imageLayer.removeChild(previous.sprite);
        previous.sprite.destroy();
        previous.texture.destroy(true);

        this.clearFragments();
        this.clearChromeStreaks();

        const sprite = new Sprite(texture);

        sprite.anchor.set(0.5);

        this.imageLayer.addChild(sprite);

        const scale = this.fitImage(sprite, texture);

        this.currentImage = {
            sprite,
            texture,
            scale,
        };

        this.currentUrl = url;

        this.app?.render();
    }

    // --------------------------------------------------
    // TRANSITION CLEANUP
    // --------------------------------------------------

    private cancelActiveTransition(): void {
        this.timeline?.kill();
        this.timeline = null;

        this.clearFragments();
        this.clearChromeStreaks();

        if (this.pendingImage) {
            this.imageLayer.removeChild(
                this.pendingImage.sprite
            );

            this.pendingImage.sprite.destroy();
            this.pendingImage.texture.destroy(true);

            this.pendingImage = null;
        }

        if (this.currentImage) {
            this.currentImage.sprite.alpha = 1;
        }

        this.displacementFilter?.scale.set(0, 0);

        if (this.displacementSprite) {
            this.displacementSprite.alpha = 0;
            this.displacementSprite.rotation = 0;
        }

        this.transitioning = false;
    }

    // --------------------------------------------------
    // DESTROY
    // --------------------------------------------------

    destroy(): void {
        if (this.destroyed) return;

        this.destroyed = true;

        // Invalidate any image requests still loading.
        this.requestId++;

        this.timeline?.kill();
        this.timeline = null;

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.clearFragments();
        this.clearChromeStreaks();

        if (this.pendingImage) {
            this.pendingImage.sprite.destroy();
            this.pendingImage.texture.destroy(true);
            this.pendingImage = null;
        }

        if (this.currentImage) {
            this.currentImage.sprite.destroy();
            this.currentImage.texture.destroy(true);
            this.currentImage = null;
        }

        this.app?.ticker.stop();

        this.app?.destroy();

        this.app = null;

        this.displacementFilter = null;
        this.displacementSprite = null;

        this.container.replaceChildren();

        this.initialized = false;
        this.transitioning = false;
    }
}
