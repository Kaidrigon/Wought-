import TypingText from "./TypingText";
import {  useState } from "react";
import { bootLogs } from "../../data/opening/boot";
import { shuffleArray } from "../../utils/random";
import ContinueButton from "./ContinueButton";
import "../../styles/opening.css";


type TerminalLineVariant =
    | "logo"
    | "subtitle"
    | "divider"
    | "boot"
    | "joke";

interface TerminalLine {
    id: string;
    text: string;

    variant: TerminalLineVariant;

    speed: number;

    delayAfter?: number;
}
interface OpeningTerminalProps {
    title: string;
    joke: string;
    ready: boolean;
    onContinue?: () => void;
}

function OpeningTerminal({
    title,
    joke,
    ready,
    onContinue,
}: OpeningTerminalProps) {

    const [visibleLines, setVisibleLines] = useState(1);
    const [randomBootLogs] = useState(() =>
    shuffleArray(bootLogs).slice(0, 3)
);
    const sequence: TerminalLine[] = [
    {
        id: "logo",
        text: "WOUGHT+",
        speed: 150,
        delayAfter: 500,
        variant: "logo",
    },
    {
        id: "title",
        text: title,
        speed: 35,
        delayAfter: 250,
        variant: "subtitle",
    },
    {
        id: "divider",
        text: "──────────────────────────────",
        speed: 5,
        delayAfter: 250,
        variant: "divider",
    },
    ...randomBootLogs.map((log, index) => ({
    id: `boot-${index}`,
    text: log,
    speed: 15,
    delayAfter: 120,
    variant: "boot" as TerminalLineVariant,
})),
    {
    id: "joke",
    text: joke,
    speed: 18,
    delayAfter: 0,
    variant: "joke",
    },];

function getLineClass(variant: TerminalLineVariant) {

    switch (variant) {

        case "logo":
            return "logo-line";

        case "subtitle":
            return "subtitle-line";

        case "divider":
            return "divider-line";
        case "boot":
            return "boot-line";

        default:
            return "terminal-line";

    }

}

return (
    <div className="opening-page">
        <div className="opening-container">

            {sequence.slice(0, visibleLines).map((line, index) => (

                <div
    key={line.id}
    className={
        line.variant === "joke"
            ? "opening-box"
            : ""
    }
>

                    {index === visibleLines - 1 ? (

                        <TypingText
    text={line.text}
    speed={line.speed}
    className={getLineClass(line.variant)}
    showCursor={true}
    onComplete={() => {

        const delay = line.delayAfter ?? 0;

        setTimeout(() => {
            setVisibleLines(previous => previous + 1);
        }, delay);

    }}
/>

                    ) : (

                        <pre className={getLineClass(line.variant)}>
                            {line.text}
                        </pre>

                    )}

                </div>

            ))}

            {visibleLines > sequence.length && (

    <ContinueButton
    ready={ready}
    onClick={onContinue}
/>

)}

        </div>
    </div>
);

}

export default OpeningTerminal;