import "./HeroLighting.css";

export default function HeroLighting() {
    return (
        <>
            <div className="hero-light hero-light--ambient" />

            <div className="hero-light hero-light--spot" />

            <div className="hero-light hero-light--bottom" />

            <div className="hero-light hero-light--accent" />
        </>
    );
}