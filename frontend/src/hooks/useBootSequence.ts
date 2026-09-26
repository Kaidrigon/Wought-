import { useEffect, useState } from "react";

function useBootSequence() {
    const [showLogo, setShowLogo] = useState(false);
    const [showSubtitle, setShowSubtitle] = useState(false);
    const [showDivider, setShowDivider] = useState(false);
    const [startTyping, setStartTyping] = useState(false);

    useEffect(() => {
        const timers = [
            setTimeout(() => setShowLogo(true), 300),
            setTimeout(() => setShowSubtitle(true), 600),
            setTimeout(() => setShowDivider(true), 900),
            setTimeout(() => setStartTyping(true), 1300),
        ];

        return () => timers.forEach(clearTimeout);
    }, []);

    return {
        showLogo,
        showSubtitle,
        showDivider,
        startTyping,
    };
}

export default useBootSequence;