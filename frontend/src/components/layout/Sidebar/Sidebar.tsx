import { useRef, useState } from "react";
import { motion } from "framer-motion";


import SidebarItem from "../../navigation/SidebarItem";

import { navigation } from "../../../data/navigation";

import "./Sidebar.css";

export default function Sidebar() {

    const [expanded, setExpanded] =
        useState(false);

    const [showLabels, setShowLabels] = useState(false);

    const labelTimer =
    useRef<number | null>(null);

    return (

        <motion.aside
    className="sidebar"

    initial={false}

    animate={{
        width: expanded
            ? "var(--sidebar-panel-width)"
            : "var(--sidebar-rail-width)",
    }}

    transition={{
        width: {
            type: "spring",
            stiffness: 200,
            damping: 26,
            mass: 1,
        },
    }}

    
    onMouseEnter={() => {

    setExpanded(true);

    if (labelTimer.current) {

        window.clearTimeout(
            labelTimer.current
        );

    }

    labelTimer.current =
        window.setTimeout(() => {

            setShowLabels(true);

        }, 90);

}}

    onMouseLeave={() => {

    if (labelTimer.current) {

        window.clearTimeout(
            labelTimer.current
        );

    }

    setShowLabels(false);

    setExpanded(false);

}}
>
    
            {navigation
    .filter((item) => item.sidebar)
    .map((item) => {

                const Icon = item.icon;

                return (

                    <SidebarItem
                        key={item.path}
                        icon={<Icon size={22} />}
                        label={item.label}
                        path={item.path}
                        expanded={showLabels}
                    />

                );

            })}

        </motion.aside>

    );

}