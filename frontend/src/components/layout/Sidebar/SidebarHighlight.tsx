import { motion } from "framer-motion";

export default function SidebarHighlight() {
    return (
        <motion.div
            layoutId="sidebar-highlight"
            className="sidebar-highlight"
            transition={{
                type: "spring",
                stiffness: 420,
                damping: 34,
            }}
        >

            <motion.div
                className="sidebar-highlight__sweep"

                initial={{
                    x: "-140%",
                    opacity: 0,
                }}

                animate={{
                    x: "180%",
                    opacity: [0, .55, .55, 0],
                }}

                transition={{
                    duration: 0.55,
                    ease: "easeOut",
                }}
            />

        </motion.div>
    );
}