import "./NavItem.css";

import { NavLink } from "react-router-dom";

type NavItemProps = {
    label: string;
    path: string;
};

export default function NavItem({
    label,
    path,
}: NavItemProps) {

    return (

        <NavLink
            to={path}
            className={({ isActive }) =>
                `nav-item ${
                    isActive
                        ? "nav-item--active"
                        : ""
                }`
            }
        >

            {label}

        </NavLink>

    );

}