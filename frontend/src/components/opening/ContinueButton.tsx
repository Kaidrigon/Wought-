import { useEffect, useState } from "react";

import Cursor from "./Cursor";

import {
    continuePrompts,
} from "../../data/opening/buttons";

import {
    getRandomItem,
} from "../../utils/random";

interface ContinueButtonProps {

    ready: boolean;

    onClick?: () => void;

}

function ContinueButton({
    ready,
    onClick,
}: ContinueButtonProps) {

    const [prompt] = useState(() =>
        getRandomItem(
            continuePrompts
        )
    );

    const [displayedText, setDisplayedText] =
        useState("");

    const [typingFinished, setTypingFinished] =
        useState(false);

    const [activated, setActivated] =
        useState(false);

    /*
     * Type the prompt exactly like before.
     */

    useEffect(() => {

        let index = 0;

        const interval =
            window.setInterval(() => {

                setDisplayedText(
                    prompt.slice(
                        0,
                        index + 1
                    )
                );

                index++;

                if (
                    index >=
                    prompt.length
                ) {

                    window.clearInterval(
                        interval
                    );

                    setTypingFinished(
                        true
                    );

                }

            }, 28);

        return () =>
            window.clearInterval(
                interval
            );

    }, [prompt]);

    /*
     * The button only activates when BOTH
     * conditions are satisfied:
     *
     * 1. The terminal finished typing.
     * 2. Startup data is ready.
     */

    useEffect(() => {

        if (
            typingFinished &&
            ready
        ) {

            const timeout =
                window.setTimeout(() => {

                    setActivated(true);

                }, 180);

            return () =>
                window.clearTimeout(
                    timeout
                );

        }

        setActivated(false);

    }, [
        typingFinished,
        ready,
    ]);

    const canContinue =
        typingFinished &&
        ready;

    return (

        <button

            className={
                activated
                    ? "continue-button active"
                    : "continue-button"
            }

            onClick={
                canContinue
                    ? onClick
                    : undefined
            }

            disabled={!canContinue}

        >

            {displayedText}

            {!typingFinished && (
                <Cursor />
            )}

        </button>

    );

}

export default ContinueButton;