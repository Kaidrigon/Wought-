import {
    useState,
} from "react";

import Hero from "../components/hero/Hero";

import HeroNavigation from "../components/hero/HeroNavigation";

import TrendingSection from "../components/sections/TrendingSection";

import NowPlayingSection from "../components/sections/NowPlayingSection";

import { useHero } from "../hooks/useHero";

import "./CinemaPage.css";

type HeroDirection =
    | "next"
    | "previous";

export default function CinemaPage() {
    const {
        heroes,
        loading,
    } = useHero();

    const [
        activeIndex,
        setActiveIndex,
    ] = useState(0);

    const [
        direction,
        setDirection,
    ] = useState<HeroDirection>("next");

    const goToSlide = (
        nextIndex: number,
        nextDirection: HeroDirection
    ) => {
        if (
            heroes.length <= 1 ||
            nextIndex === activeIndex
        ) {
            return;
        }

        setDirection(
            nextDirection
        );

        setActiveIndex(
            nextIndex
        );
    };

    const goNext = () => {
        if (heroes.length <= 1) {
            return;
        }

        const nextIndex =
            (activeIndex + 1) %
            heroes.length;

        goToSlide(
            nextIndex,
            "next"
        );
    };

    const goPrevious = () => {
        if (heroes.length <= 1) {
            return;
        }

        const previousIndex =
            activeIndex === 0
                ? heroes.length - 1
                : activeIndex - 1;

        goToSlide(
            previousIndex,
            "previous"
        );
    };

    if (
        loading ||
        heroes.length === 0
    ) {
        return null;
    }

    return (
        <main className="home-page">

            <section className="home-page__hero">

                <Hero
                    hero={
                        heroes[
                            activeIndex
                        ]
                    }
                    direction={
                        direction
                    }
                />

                <HeroNavigation
                    activeIndex={
                        activeIndex
                    }
                    total={
                        heroes.length
                    }
                    onPrevious={
                        goPrevious
                    }
                    onNext={
                        goNext
                    }
                />

            </section>

            <div className="home-page__content">

                <TrendingSection />

                <NowPlayingSection />

            </div>

        </main>
    );
}