import {
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import "./HeroNavigation.css";

type HeroNavigationProps = {
    activeIndex: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
};

export default function HeroNavigation({
    activeIndex,
    total,
    onPrevious,
    onNext,
}: HeroNavigationProps) {
    const current =
        String(activeIndex + 1)
            .padStart(2, "0");

    const count =
        String(total)
            .padStart(2, "0");

    return (
        <nav
            className="hero-navigation"
            aria-label="Hero navigation"
        >
            <button
                type="button"
                className="hero-navigation__button"
                onClick={onPrevious}
                aria-label="Previous featured movie"
            >
                <ChevronLeft
                    size={20}
                    strokeWidth={1.5}
                />
            </button>

            <div className="hero-navigation__counter">
                <span className="hero-navigation__current">
                    {current}
                </span>

                <span className="hero-navigation__divider">
                    /
                </span>

                <span className="hero-navigation__total">
                    {count}
                </span>
            </div>

            <button
                type="button"
                className="hero-navigation__button"
                onClick={onNext}
                aria-label="Next featured movie"
            >
                <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                />
            </button>
        </nav>
    );
}