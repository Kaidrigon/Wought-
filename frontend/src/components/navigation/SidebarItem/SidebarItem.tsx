import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import SidebarPill from "../../layout/Sidebar/SidebarHighlight";
import { useTheme } from "../../../providers/ThemeProvider";


import "./SidebarItem.css";

type SidebarItemProps = {
    icon: ReactNode;
    label: string;
    path: string;
    expanded: boolean;
};

export default function SidebarItem({
    icon,
    label,
    path,
    expanded,
}: SidebarItemProps) {

    const { section } = useTheme();
    const finalPath =
    path === "/"
        ? `/${section}`
        : `/${section}${path}`;
    return (
        <NavLink
    to={finalPath}
    end={label === "Home"}
>

{({ isActive }) => (

    <div
        className={`sidebar-item ${
            isActive
                ? "sidebar-item--active"
                : ""
        }`}
    >

        {isActive && <SidebarPill />}

    <motion.div
        layout

        whileHover={{
            x: 4,
            transition: {
                duration: 0.18,
            },
        }}

        className="sidebar-item__content"
    >
            <motion.span
                layout
                className="sidebar-item__icon"
                    >
                {icon}
    </motion.span>

            <motion.span
    className="sidebar-item__label"
    animate={{
        opacity: expanded ? 1 : 0,
        x: expanded ? 0 : -10,
        width: expanded ? "auto" : 0,
    }}
    transition={{
        delay: expanded ? 0.08 : 0,
        duration: 0.22,
        ease: "easeOut",
    }}
    style={{
        overflow: "hidden",
        whiteSpace: "nowrap",
    }}
>
    {label}
</motion.span>


                    </motion.div>

    </div>

)}

</NavLink>
    );
}