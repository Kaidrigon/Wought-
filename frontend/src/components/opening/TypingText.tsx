import { useEffect, useState } from "react";

import Cursor from "./Cursor";

interface TypingTextProps {
    text: string;
    speed: number;
    className?: string;
    showCursor?: boolean;
    onComplete?: () => void;
}

function TypingText({
    text,
    speed,
    className = "terminal-line",
    showCursor = false,
    onComplete,
}: TypingTextProps){

    const [displayedText, setDisplayedText] = useState("");
    const [typingFinished, setTypingFinished] = useState(false);

    useEffect(() => {

        setDisplayedText("");
        setTypingFinished(false);

        let cancelled = false;

        function type(index: number) {

            if (cancelled) return;

            setDisplayedText(text.slice(0, index));

            if (index >= text.length) {
    setDisplayedText(text);
    setTypingFinished(true);
    onComplete?.();
    return;
}

            setTimeout(() => {
                type(index + 1);
            }, speed);
        }

        type(0);

        return () => {
            cancelled = true;
        };

    }, [text, speed, onComplete]);

    return (
    <pre className={className}>

        {displayedText}

        {showCursor && (
    <Cursor blinking={typingFinished} />
)}

    </pre>
);
}

export default TypingText;