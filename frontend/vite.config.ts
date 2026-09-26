import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    server: {
        allowedHosts: [
            "860c-2409-40d6-8-9304-7da0-1686-2978-ba8d.ngrok-free.app",
        ],
    },
});