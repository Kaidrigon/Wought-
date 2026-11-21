
import { API_BASE_URL } from "../../../../services/api/api";


import {
    Application,
    Container,
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

type Panel = {
    sprite: Sprite;
    texture: Texture;
    targetX: number;
    targetY: number;
    index: number;
};

export default class AnimeTransitionEngine {
    private container: HTMLDivElement;

    private app: Application | null = null;

    private imageLayer = new Container();

    private panelLayer = new Container();

    private effectLayer = new Container();

    private currentImage: ImageLayer | null = null;

    private pendingImage: ImageLayer | null = null;

    private timeline: gsap.core.Timeline | null = null;

    private resizeObserver: ResizeObserver | null = null;

    private panels: Panel[] = [];

    private effectGraphics: Graphics[] = [];

    private ghostSprites: Sprite[] = [];

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

        app.stage.addChild(this.imageLayer);
        app.stage.addChild(this.panelLayer);
        app.stage.addChild(this.effectLayer);

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

    // --------------------------------------------------
    // IMAGE LOADING
    // --------------------------------------------------

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

        this.app.render();
    }

    // --------------------------------------------------
    // ANIME PANEL SYSTEM
    // --------------------------------------------------

    private clearPanels(): void {
        for (const panel of this.panels) {
            this.panelLayer.removeChild(panel.sprite);

            panel.sprite.destroy();

            panel.texture.destroy(false);
        }

        this.panels = [];
    }

    private createPanels(image: ImageLayer): void {
        this.clearPanels();

        // Larger panels instead of tiny floating particles.
        const columns = 5;
        const rows = 3;

        const textureWidth = image.texture.width;
        const textureHeight = image.texture.height;

        const cellWidth = textureWidth / columns;
        const cellHeight = textureHeight / rows;

        let index = 0;

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const x = column * cellWidth;
                const y = row * cellHeight;

                const frameWidth = Math.min(
                    Math.ceil(cellWidth + 1),
                    textureWidth - x
                );

                const frameHeight = Math.min(
                    Math.ceil(cellHeight + 1),
                    textureHeight - y
                );

                const panelTexture = new Texture({
                    source: image.texture.source,
                    frame: new Rectangle(
                        x,
                        y,
                        frameWidth,
                        frameHeight
                    ),
                });

                const sprite = new Sprite(panelTexture);

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

                // Slightly angled panels create a manga-panel feel.
                sprite.skew.x = row % 2 === 0 ? -0.12 : 0.12;

                this.panelLayer.addChild(sprite);

                this.panels.push({
                    sprite,
                    texture: panelTexture,
                    targetX,
                    targetY,
                    index,
                });

                index++;
            }
        }
    }

    // --------------------------------------------------
    // ANIME SPEED LINES
    // --------------------------------------------------

    private createSpeedLines(): Graphics {
        const lines = new Graphics();

        const lineCount = 42;

        for (let i = 0; i < lineCount; i++) {
            const y = Math.random() * this.height;

            const startX = Math.random() * this.width * 0.5;
            const endX = startX + this.width * (0.35 + Math.random() * 0.7);

            const thickness = Math.random() > 0.85 ? 2.5 : 1;

            const color =
                i % 7 === 0
                    ? 0x59e7cb
                    : i % 11 === 0
                        ? 0xb9a6ff
                        : 0xffffff;

            lines
                .moveTo(startX, y)
                .lineTo(endX, y - this.height * 0.035)
                .stroke({
                    color,
                    width: thickness,
                    alpha: 0.65 + Math.random() * 0.3,
                });
        }

        lines.alpha = 0;

        this.effectLayer.addChild(lines);
        this.effectGraphics.push(lines);

        return lines;
    }

    // --------------------------------------------------
    // DIGITAL GLITCH BARS
    // --------------------------------------------------

    private createGlitchBars(): Graphics[] {
        const colors = [
            0x59e7cb,
            0xb9a6ff,
            0xffffff,
            0x8b78ff,
        ];

        const bars: Graphics[] = [];

        for (let i = 0; i < 12; i++) {
            const bar = new Graphics();

            const barHeight = 2 + Math.random() * 13;
            const barWidth = this.width * (0.12 + Math.random() * 0.55);

            bar
                .rect(
                    0,
                    0,
                    barWidth,
                    barHeight
                )
                .fill({
                    color: colors[i % colors.length],
                });

            bar.position.set(
                Math.random() * this.width,
                Math.random() * this.height
            );

            bar.alpha = 0;

            this.effectLayer.addChild(bar);
            this.effectGraphics.push(bar);

            bars.push(bar);
        }

        return bars;
    }

    // --------------------------------------------------
    // IMPACT FRAME
    // --------------------------------------------------

    private createImpactFlash(): Graphics {
        const flash = new Graphics();

        flash
            .rect(
                0,
                0,
                this.width,
                this.height
            )
            .fill({
                color: 0xffffff,
            });

        flash.alpha = 0;

        this.effectLayer.addChild(flash);
        this.effectGraphics.push(flash);

        return flash;
    }

    // --------------------------------------------------
    // CHROMATIC RGB SPLIT
    // --------------------------------------------------

    private createChromaticGhosts(
        texture: Texture,
        scale: number
    ): void {
        this.clearGhosts();

        const cyan = new Sprite(texture);
        const violet = new Sprite(texture);

        cyan.anchor.set(0.5);
        violet.anchor.set(0.5);

        cyan.scale.set(scale * 1.015);
        violet.scale.set(scale * 1.015);

        cyan.position.set(
            this.width / 2 - 13,
            this.height / 2
        );

        violet.position.set(
            this.width / 2 + 13,
            this.height / 2
        );

        cyan.tint = 0x59e7cb;
        violet.tint = 0xb99aff;

        cyan.alpha = 0;
        violet.alpha = 0;

        this.imageLayer.addChild(cyan);
        this.imageLayer.addChild(violet);

        this.ghostSprites.push(cyan, violet);
    }

    private clearGhosts(): void {
        for (const ghost of this.ghostSprites) {
            this.imageLayer.removeChild(ghost);
            ghost.destroy();
        }

        this.ghostSprites = [];
    }

    // --------------------------------------------------
    // EFFECT CLEANUP
    // --------------------------------------------------

    private clearEffects(): void {
        for (const graphic of this.effectGraphics) {
            this.effectLayer.removeChild(graphic);
            graphic.destroy();
        }

        this.effectGraphics = [];

        this.clearGhosts();
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

        // Ignore outdated image requests.
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

        const directionMultiplier =
            direction === "next" ? 1 : -1;

        // --------------------------------------------------
        // INCOMING ARTWORK
        // --------------------------------------------------

        const incomingSprite = new Sprite(incomingTexture);

        incomingSprite.anchor.set(0.5);
        incomingSprite.alpha = 0;

        this.imageLayer.addChild(incomingSprite);

        const incomingScale = this.fitImage(
            incomingSprite,
            incomingTexture
        );

        incomingSprite.scale.set(incomingScale * 1.12);

        this.pendingImage = {
            sprite: incomingSprite,
            texture: incomingTexture,
            scale: incomingScale,
        };

        // --------------------------------------------------
        // OUTGOING PANELS
        // --------------------------------------------------

        this.createPanels(outgoing);

        outgoing.sprite.alpha = 0;

        // --------------------------------------------------
        // TRANSITION EFFECTS
        // --------------------------------------------------

        const speedLines = this.createSpeedLines();

        const glitchBars = this.createGlitchBars();

        const impactFlash = this.createImpactFlash();

        this.createChromaticGhosts(
            incomingTexture,
            incomingScale
        );

        const [cyanGhost, violetGhost] = this.ghostSprites;

        const timeline = gsap.timeline({
            onComplete: () => {
                if (this.destroyed) return;

                // Remove the outgoing artwork.
                this.imageLayer.removeChild(outgoing.sprite);

                outgoing.sprite.destroy();
                outgoing.texture.destroy(true);

                this.clearPanels();
                this.clearEffects();

                // Settle the incoming artwork.
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

                this.transitioning = false;
                this.timeline = null;

                this.app?.render();
                this.app?.ticker.stop();
            },
        });

        this.timeline = timeline;

        this.app?.ticker.start();

        // --------------------------------------------------
        // PHASE 1 — SNAP / PRE-IMPACT
        // --------------------------------------------------

        timeline
            .to(outgoing.sprite.scale, {
  x: outgoing.scale * 1.035,
  y: outgoing.scale * 1.035,
  duration: 0.32,
  ease: "power2.in",
}, 0)
            .to(
                incomingSprite,
                {
                    alpha: 1,
                    duration: 0.22,
                    ease: "power1.out",
                },
                0.16
            );

        // --------------------------------------------------
        // PHASE 2 — ANIME PANEL BREAK
        // --------------------------------------------------

        for (const panel of this.panels) {
            const row = Math.floor(panel.index / 5);
            const column = panel.index % 5;

            const alternatingDirection =
                (row + column) % 2 === 0 ? 1 : -1;

            const delay =
                row * 0.035 +
                Math.random() * 0.08;

            const travelX =
                directionMultiplier *
                this.width *
                (0.42 + Math.random() * 0.3);

            const travelY =
                alternatingDirection *
                this.height *
                (0.08 + Math.random() * 0.16);

            timeline
                .to(
                    panel.sprite,
                    {
                        x: panel.targetX + travelX,
                        y: panel.targetY + travelY,
                        rotation:
                            directionMultiplier *
                            alternatingDirection *
                            (0.12 + Math.random() * 0.2),
                        alpha: 0,
                        duration: 0.38 + Math.random() * 0.16,
                        ease: "power4.in",
                    },
                    0.04 + delay
                )
                .to(
                    panel.sprite.scale,
                    {
                        x: outgoing.scale * 0.82,
                        y: outgoing.scale * 0.82,
                        duration: 0.42,
                        ease: "power3.in",
                    },
                    0.04 + delay
                );
        }

        // --------------------------------------------------
        // PHASE 3 — SPEED LINES
        // --------------------------------------------------

        speedLines.x =
            directionMultiplier === 1
                ? -this.width * 0.5
                : this.width * 0.5;

        timeline
            .to(
                speedLines,
                {
                    alpha: 1,
                    duration: 0.1,
                    ease: "power1.out",
                },
                0.12
            )
            .to(
                speedLines,
                {
                    x:
                        directionMultiplier === 1
                            ? this.width * 0.65
                            : -this.width * 0.65,
                    duration: 0.55,
                    ease: "power4.in",
                },
                0.12
            )
            .to(
                speedLines,
                {
                    alpha: 0,
                    duration: 0.18,
                    ease: "power2.out",
                },
                0.53
            );

        // --------------------------------------------------
        // PHASE 4 — IMPACT FRAME
        // --------------------------------------------------

        timeline
            .set(
                impactFlash,
                { alpha: 0 },
                0.32
            )
            .to(
                impactFlash,
                {
                    alpha: 0.92,
                    duration: 0.045,
                    ease: "none",
                },
                0.32
            )
            .to(
                impactFlash,
                {
                    alpha: 0,
                    duration: 0.17,
                    ease: "power2.out",
                },
                0.365
            )
            .to(
                impactFlash,
                {
                    alpha: 0.42,
                    duration: 0.035,
                    ease: "none",
                },
                0.55
            )
            .to(
                impactFlash,
                {
                    alpha: 0,
                    duration: 0.13,
                    ease: "power2.out",
                },
                0.585
            );

        // --------------------------------------------------
        // PHASE 5 — DIGITAL GLITCH
        // --------------------------------------------------

        glitchBars.forEach((bar ) => {
            const startX =
                Math.random() * this.width * 0.7;

            const endX =
                directionMultiplier === 1
                    ? this.width + this.width * 0.4
                    : -this.width * 0.4;

            const delay = 0.27 + Math.random() * 0.3;

            timeline
                .set(
                    bar,
                    {
                        x: startX,
                        alpha: 0,
                    },
                    delay
                )
                .to(
                    bar,
                    {
                        x: endX,
                        alpha: 0.65 + Math.random() * 0.3,
                        duration: 0.08 + Math.random() * 0.1,
                        ease: "none",
                    },
                    delay
                )
                .to(
                    bar,
                    {
                        alpha: 0,
                        duration: 0.12,
                        ease: "power1.out",
                    },
                    delay + 0.1
                );
        });

        // --------------------------------------------------
        // PHASE 6 — RGB SPLIT
        // --------------------------------------------------

        if (cyanGhost && violetGhost) {
            timeline
                .to(
                    cyanGhost,
                    {
                        alpha: 0.38,
                        x: this.width / 2 - 25,
                        duration: 0.09,
                        ease: "none",
                    },
                    0.32
                )
                .to(
                    violetGhost,
                    {
                        alpha: 0.38,
                        x: this.width / 2 + 25,
                        duration: 0.09,
                        ease: "none",
                    },
                    0.32
                )
                .to(
                    cyanGhost,
                    {
                        alpha: 0,
                        x: this.width / 2,
                        duration: 0.28,
                        ease: "power3.out",
                    },
                    0.43
                )
                .to(
                    violetGhost,
                    {
                        alpha: 0,
                        x: this.width / 2,
                        duration: 0.28,
                        ease: "power3.out",
                    },
                    0.43
                );
        }

        // --------------------------------------------------
        // PHASE 7 — NEW ARTWORK LOCK-IN
        // --------------------------------------------------

        timeline
            .fromTo(
                incomingSprite.scale,
                {
                    x: incomingScale * 1.12,
                    y: incomingScale * 1.12,
                },
                {
                    x: incomingScale,
                    y: incomingScale,
                    duration: 0.78,
                    ease: "expo.out",
                },
                0.2
            )
            .fromTo(
                incomingSprite,
                {
                    rotation: directionMultiplier * 0.012,
                },
                {
                    rotation: 0,
                    duration: 0.62,
                    ease: "power3.out",
                },
                0.35
            );

        // A short final snap gives the new artwork a decisive landing.
        timeline
            .to(
                incomingSprite.scale,
                {
                    x: incomingScale * 1.012,
                    y: incomingScale * 1.012,
                    duration: 0.09,
                    ease: "power2.out",
                },
                0.78
            )
            .to(
                incomingSprite.scale,
                {
                    x: incomingScale,
                    y: incomingScale,
                    duration: 0.18,
                    ease: "power3.out",
                },
                0.87
            );
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
    // TRANSITION CANCELLATION
    // --------------------------------------------------

    private cancelActiveTransition(): void {
        this.timeline?.kill();
        this.timeline = null;

        this.clearPanels();
        this.clearEffects();

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
            this.currentImage.sprite.rotation = 0;

            this.currentImage.sprite.scale.set(
                this.currentImage.scale
            );
        }

        this.transitioning = false;
    }

    // --------------------------------------------------
    // DESTROY
    // --------------------------------------------------

    destroy(): void {
        if (this.destroyed) return;

        this.destroyed = true;

        // Invalidate pending image requests.
        this.requestId++;

        this.timeline?.kill();
        this.timeline = null;

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.clearPanels();
        this.clearEffects();

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

        this.container.replaceChildren();

        this.initialized = false;
        this.transitioning = false;
    }
}
