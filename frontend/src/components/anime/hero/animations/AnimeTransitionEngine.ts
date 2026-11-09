import { API_BASE_URL } from "../../../../services/api/api";
import {
    Application,
    Assets,
    Container,
    DisplacementFilter,
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

    private currentImage: ImageLayer | null = null;

    private displacementSprite: Sprite | null = null;

    private displacementFilter: DisplacementFilter | null = null;

    private timeline: gsap.core.Timeline | null = null;

    private resizeObserver: ResizeObserver | null = null;

    private fragments: Fragment[] = [];

    private initialized = false;

    private destroyed = false;

    private transitioning = false;

    private currentUrl = "";

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
        app.stage.addChild(this.fragmentLayer);

        this.createDisplacement();

        const texture = await this.loadImage(initialImage);

        if (this.destroyed) return;

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

    try {
        return await Assets.load<Texture>(proxyUrl.toString());
    } catch (error) {
        throw new Error(
            `Failed to load AniList image through Wought+ proxy: ${url}`,
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

    private createDisplacement(): void {
        const size = 512;

        const canvas = document.createElement("canvas");

        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not create displacement map.");
        }

        const imageData = context.createImageData(size, size);
        const data = imageData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;

                const nx = x / size;
                const ny = y / size;

                const waveX =
                    Math.sin(nx * 19 + Math.sin(ny * 8) * 4);

                const waveY =
                    Math.cos(ny * 17 + Math.sin(nx * 10) * 5);

                const detail =
                    Math.sin(nx * 35 + ny * 22) *
                    Math.cos(ny * 31 - nx * 18);

                const radial = Math.sqrt(
                    (nx - 0.5) ** 2 +
                    (ny - 0.5) ** 2
                );

                const ripple = Math.sin(radial * 55);

                data[index] = Math.max(
                    0,
                    Math.min(255, 128 + waveX * 43 + detail * 20 + ripple * 15)
                );

                data[index + 1] = Math.max(
                    0,
                    Math.min(255, 128 + waveY * 43 - detail * 17 + ripple * 15)
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
        displacementSprite.alpha = 0;

        this.app?.stage.addChild(displacementSprite);

        const filter = new DisplacementFilter({
            sprite: displacementSprite,
            scale: {
                x: 0,
                y: 0,
            },
        });

        this.imageLayer.filters = [filter];

        this.displacementSprite = displacementSprite;
        this.displacementFilter = filter;
    }

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

        const columns = 8;
        const rows = 5;

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

                const targetX =
                    this.width / 2 + centerX;

                const targetY =
                    this.height / 2 + centerY;

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

    async transitionTo(
        url: string,
        direction: TransitionDirection
    ): Promise<void> {
        if (
            !this.initialized ||
            this.destroyed ||
            !this.currentImage ||
            url === this.currentUrl
        ) {
            return;
        }

        const incomingTexture = await this.loadImage(url);

        if (this.destroyed) return;

        if (this.reducedMotion) {
            this.showImmediately(incomingTexture, url);
            return;
        }

        this.cancelActiveTransition();

        const outgoing = this.currentImage;

        if (!outgoing) return;

        this.transitioning = true;

        const incomingSprite = new Sprite(incomingTexture);

        incomingSprite.anchor.set(0.5);
        incomingSprite.alpha = 0;

        this.imageLayer.addChild(incomingSprite);

        const incomingScale = this.fitImage(
            incomingSprite,
            incomingTexture
        );

        incomingSprite.scale.set(
            incomingScale * 1.08
        );

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

        const directionMultiplier = direction === "next" ? 1 : -1;

        const timeline = gsap.timeline({
            onComplete: () => {
                if (this.destroyed) return;

                this.imageLayer.removeChild(outgoing.sprite);
                outgoing.sprite.destroy();

                this.clearFragments();

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

        if (displacement) {
            timeline
                .to(
                    displacement.scale,
                    {
                        x: directionMultiplier * 100,
                        y: 65,
                        duration: 0.65,
                        ease: "power3.inOut",
                    },
                    0
                )
                .to(
                    displacement.scale,
                    {
                        x: directionMultiplier * 155,
                        y: -85,
                        duration: 0.42,
                        ease: "power2.inOut",
                    },
                    0.42
                )
                .to(
                    displacement.scale,
                    {
                        x: 0,
                        y: 0,
                        duration: 0.65,
                        ease: "power3.out",
                    },
                    1.1
                );
        }

        if (displacementSprite) {
            timeline.to(
                displacementSprite,
                {
                    rotation: directionMultiplier * Math.PI * 0.45,
                    duration: 1.1,
                    ease: "power2.inOut",
                },
                0
            );
        }

        timeline
            .to(
                incomingSprite,
                {
                    alpha: 1,
                    duration: 0.95,
                    ease: "power2.out",
                },
                0.38
            )
            .to(
                incomingSprite.scale,
                {
                    x: incomingScale,
                    y: incomingScale,
                    duration: 1.15,
                    ease: "power3.out",
                },
                0.25
            );

        for (const fragment of this.fragments) {
            const random = Math.random();

            const scatterX =
                (random - 0.5) *
                this.width *
                0.85;

            const scatterY =
                (Math.random() - 0.5) *
                this.height *
                0.85;

            const rotation =
                (Math.random() - 0.5) *
                (Math.PI * 1.6);

            const delay = Math.random() * 0.24;

            timeline
                .to(
                    fragment.sprite,
                    {
                        x: fragment.targetX + scatterX +
                            directionMultiplier * this.width * 0.12,
                        y: fragment.targetY + scatterY,
                        rotation,
                        alpha: 0,
                        duration: 0.85 + Math.random() * 0.3,
                        ease: "power3.in",
                    },
                    0.05 + delay
                )
                .to(
                    fragment.sprite.scale,
                    {
                        x: outgoing.scale * 0.72,
                        y: outgoing.scale * 0.72,
                        duration: 0.85,
                        ease: "power2.in",
                    },
                    0.05 + delay
                );
        }
    }

    private showImmediately(texture: Texture, url: string): void {
        if (!this.currentImage) return;

        this.currentImage.sprite.destroy();

        this.clearFragments();

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

    private cancelActiveTransition(): void {
        this.timeline?.kill();
        this.timeline = null;

        this.clearFragments();

        if (!this.currentImage) return;

        this.imageLayer.children
            .filter(child => child !== this.currentImage?.sprite)
            .forEach(child => {
                this.imageLayer.removeChild(child);
                child.destroy();
            });

        this.currentImage.sprite.alpha = 1;

        this.displacementFilter?.scale.set(0, 0);

        if (this.displacementSprite) {
            this.displacementSprite.alpha = 0;
            this.displacementSprite.rotation = 0;
        }

        this.transitioning = false;
    }

    destroy(): void {
        if (this.destroyed) return;

        this.destroyed = true;

        this.timeline?.kill();
        this.timeline = null;

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.clearFragments();

        this.app?.ticker.stop();

        this.app?.destroy();

        this.app = null;
        this.currentImage = null;
        this.displacementFilter = null;
        this.displacementSprite = null;

        this.container.replaceChildren();

        this.initialized = false;
        this.transitioning = false;
    }
}
