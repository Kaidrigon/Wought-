import "./DonationJokeSection.css";

export default function DonationJokeSection() {

    return (
        <section className="donation-joke">

            <div className="donation-joke__content">

                <div className="donation-joke__eyebrow">
                    FINANCIAL CRISIS WARNING SYSTEM
                </div>

                <h2 className="donation-joke__title">
                    We tried selling out, but the sponsors saw your face.
                </h2>

                <p className="donation-joke__text">
                    We literally begged an ad agency to fund this dumpster fire. 
                    They took one look at your face, gagged and instantly blocked our number. 
                    So now we're proudly, shamelessly shaking you down for cash instead. 
                    Every dime goes directly toward buying a PS5 so we can visit the strip club 
                    in GTA 6 and goon with our pp jorking hands or maybe some other stuff. Who knows? We don't have a plan. We just want to goon or maybe upgrade this project.
                </p>

                <button
                    type="button"
                    className="donation-joke__button"
                >
                    FUND THE GTA 6 GOON CAVE
                </button>

            </div>

            <div className="donation-joke__stamp">
                W+
            </div>

        </section>
    );
}
