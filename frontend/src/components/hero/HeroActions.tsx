import {
    Play,
    Archive,
    FileText,
} from "lucide-react";

import { motion } from "framer-motion";

import "./HeroActions.css";

export default function HeroActions() {

    return (

        <div className="hero-actions">

            <motion.button
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
                className="
                    hero-action
                    hero-action--primary
                "
            >

                <span className="hero-action__indicator" />

                <Play
                    size={20}
                    fill="currentColor"
                />

                <span>

                    Play

                </span>

            </motion.button>

            <motion.button
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
                className="hero-action"
            >

                <span className="hero-action__indicator" />

                <Archive size={20} />

                <span>

                    Archive

                </span>

            </motion.button>

            <motion.button
                whileHover={{
                    y: -3,
                    scale: 1.02,
                }}
                whileTap={{
                    scale: 0.97,
                }}
                className="hero-action"
            >

                <span className="hero-action__indicator" />

                <FileText size={20} />

                <span>

                    Dossier

                </span>

            </motion.button>

        </div>

    );

}