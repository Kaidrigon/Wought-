import {
    Play,
    Archive,
    FileText,
} from "lucide-react";

import { motion } from "framer-motion";

import { Link } from "react-router-dom";

import type { HeroData } from "../../types/hero";

import "./HeroActions.css";

type HeroActionsProps = {
    hero: HeroData;
};

export default function HeroActions({
    hero,
}: HeroActionsProps) {
    const detailPath =
        `/cinema/${hero.media_type}/${hero.tmdb_id}`;

    const watchPath =
        `${detailPath}/watch`;

    return (
        <div className="hero-actions">

            {/* PLAY */}
            <motion.div
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
            >
                <Link
                    to={watchPath}
                    className="
                        hero-action
                        hero-action--primary
                    "
                    aria-label={`Play ${hero.title}`}
                >
                    <span className="hero-action__indicator" />

                    <Play
                        size={20}
                        fill="currentColor"
                    />

                    <span>Play</span>
                </Link>
            </motion.div>

            {/* ARCHIVE — COMING LATER */}
            <motion.button
                type="button"
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
                className="hero-action"
                disabled
                title="Archive will be available when accounts are ready"
                aria-label="Archive — coming soon"
            >
                <span className="hero-action__indicator" />

                <Archive size={20} />

                <span>Archive</span>
            </motion.button>

            {/* DOSSIER */}
            <motion.div
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
            >
                <Link
                    to={detailPath}
                    className="hero-action"
                    aria-label={`View dossier for ${hero.title}`}
                >
                    <span className="hero-action__indicator" />

                    <FileText size={20} />

                    <span>Dossier</span>
                </Link>
            </motion.div>

        </div>
    );
}