import { Search } from "lucide-react";
import Logo from "../../ui/Logo";
import NavigationLinks from "../../navigation/NavigationLinks";

import { NavLink } from "react-router-dom";
import { useTheme } from "../../../providers/ThemeProvider";

import "./Navbar.css";

export default function Navbar() {

    const { section } = useTheme();

    return (

        <header className="navbar">

            <div className="navbar__left">

                <Logo />

            </div>

            <div className="navbar__center">

                <NavigationLinks />

            </div>

            <div className="navbar__right">

                <NavLink
                    to={`/${section}/search`}
                    className="navbar__icon-button"
                    aria-label="Search"
                >
                    <Search
                        size={20}
                        strokeWidth={2.2}
                    />
                </NavLink>

                <button
                    type="button"
                    className="navbar__avatar"
                    aria-label="Account"
                >
                    JR
                </button>

            </div>

        </header>

    );

}