import "./Logo.css";

type LogoProps = {
    size?: "small" | "medium" | "large";
};

export default function Logo({
    size = "medium",
}: LogoProps) {
    return (
        <h1 className={`logo logo--${size}`}>
            WOUGHT+
        </h1>
    );
}