import { useEffect, useState } from "react";

import OpeningTerminal from "../components/opening/OpeningTerminal";

import {
    initializeOpeningSystem,
    completeOpening,
} from "../services/opening/OpeningManager";

import { preloadHeroStartup } from "../utils/heroStartup";

import type { OpeningDecision } from "../types/opening";

interface CorporateOrientationProps {
    onComplete?: () => void;
}

function CorporateOrientation({
    onComplete,
}: CorporateOrientationProps) {
    const [decision, setDecision] =
        useState<OpeningDecision | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [startupReady, setStartupReady] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadOpening() {
            const [
                result,
            ] = await Promise.all([
                initializeOpeningSystem(),
                preloadHeroStartup(),
            ]);

            if (cancelled) {
                return;
            }

            setDecision(result);
            setStartupReady(true);
            setLoading(false);
        }

        loadOpening();

        return () => {
            cancelled = true;
        };
    }, []);

    /*
     * No opening rule won.
     *
     * RuleEngine returns null when there is nothing
     * to show. Notify App.tsx after rendering instead
     * of calling setState during render.
     */
    useEffect(() => {
        if (!loading && decision === null) {
            onComplete?.();
        }
    }, [loading, decision, onComplete]);

    /*
     * Still determining whether an opening is required.
     */
    if (loading) {
        return null;
    }

    /*
     * No opening required.
     *
     * App.tsx has been notified by the effect above
     * and will replace this component with AppContent.
     */
    if (decision === null) {
        return null;
    }

    /*
     * Opening is required.
     */
    if (!decision.shouldShowOpening) {
        return null;
    }

    const joke =
        decision.jokes[
            Math.floor(
                Math.random() *
                    decision.jokes.length
            )
        ];

    return (
        <OpeningTerminal
            title="Corporate Orientation"
            joke={joke.text}
            ready={startupReady}
            onContinue={async () => {
                await completeOpening(
                    decision
                );

                /*
                 * Opening has completed.
                 * Now remove the orientation and
                 * mount the real application.
                 */
                onComplete?.();
            }}
        />
    );
}

export default CorporateOrientation;