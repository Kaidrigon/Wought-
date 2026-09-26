import type { ReactNode } from "react";

import Sidebar from "../Sidebar";
import Navbar from "../topbar";

import "./AppLayout.css";

type AppLayoutProps = {
    children: ReactNode;
};

export default function AppLayout({
    children,
}: AppLayoutProps) {

    return (

        <div className="app-layout">

            <Sidebar />

            <div className="app-layout__main">

                <Navbar />

                <main className="app-layout__content">

                    {children}

                </main>

            </div>

        </div>

    );

}