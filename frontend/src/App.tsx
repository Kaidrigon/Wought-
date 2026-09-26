import { useCallback, useState } from "react";

import CorporateOrientation from "./pages/CorporateOrientation";
import AppContent from "./AppContent";

import "./App.css";

export default function App() {

    const [openingActive, setOpeningActive] =
        useState(true);

    const handleOpeningComplete =
        useCallback(() => {
            setOpeningActive(false);
        }, []);

    return (
        <>
            {openingActive ? (
                <CorporateOrientation
                    onComplete={
                        handleOpeningComplete
                    }
                />
            ) : (
                <AppContent />
            )}
        </>
    );
}