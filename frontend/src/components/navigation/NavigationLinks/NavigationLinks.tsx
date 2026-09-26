import NavItem from "../NavItem";



import { navigation } from "../../../data/navigation";

import "./NavigationLinks.css";

export default function NavigationLinks() {


    const topbarItems = navigation.filter(
        (item) => item.topbar
    );
    

    return (

        <nav
    className="navigation-links"
    aria-label="Primary Navigation"
>

    {topbarItems.map((item) => (

        <NavItem
            key={item.id}
            label={item.label}
            path={item.path}
            
        />

    ))}

</nav>

    );

}