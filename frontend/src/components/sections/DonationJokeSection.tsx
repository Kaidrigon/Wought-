import "./DonationJokeSection.css";

type DonationJokeSectionProps = {
    variant?: "corporate" | "anime";
};

export default function DonationJokeSection({
    variant = "corporate",
}: DonationJokeSectionProps) {
    return (
        <section
            className={`donation-joke ${
                variant === "anime" ? "donation-joke--anime" : ""
            }`}
        >
            <div className="donation-joke__content">
                <div className="donation-joke__eyebrow">
                    FINANCIAL CRISIS WARNING SYSTEM
                </div>

                <h2 className="donation-joke__title">
                    We tried selling out, but the sponsors saw your face.
                </h2>

                <p className="donation-joke__text">
                    We begged an ad agency to throw money at this dumpster fire. 
                    They took one look, gagged like they smelled a three day-old corpse, and blocked the number so hard it left a bruise. 
                    So now we're just openly begging strangers for cash like the degenerate clowns we are. 
                    Every single rupee goes straight into a PS5 so we can go full brain rot in GTA 6 strip clubs, public gooning, both hands on the stick, zero shame. 
                    Or we’ll upgrade the site. Or buy a gallon of lube and a pack of tissues. We don’t have a plan. We just want to goon until our wrists give out.
                    Also my ex called after reading one joke that didn’t even use her name and somehow decided this entire website was built as a personal attack on her. 
                    The delusion is so thick you could spread it on toast. 
                    Then she said she “liked the book I wrote about her” because she was drowning in guilt... as if I was the one who needed absolution. Bitch, you cheated. 
                    You felt guilty because you got caught with another dick in your mouth. 
                    That’s not a tragic romance, that’s basic biology. By that logic I should be balls deep in your mother right now out of pure guilt and you’d still find a way to make it about how hard your life is.
                    She cried on the phone, said she still loved me, begged me to take her back... the exact second I stopped giving her attention after she got exposed. 
                    The second the free validation stopped, suddenly she was “in love” again. Then she hit me with the classic “you’re just like every other guy.”
                    Yeah, Mimansa, I am. But at least I never sent nudes to a 15 year old guy with the excuse “when your parents catch you talking to one guy, 
                    the other becomes your only option.” That’s not an excuse, that’s the LinkedIn bio of a professional attention whore. 
                    You’re not mysterious or complex. You’re just a loud, empty, self obsessed girl who thinks the sun rises out of her ass every morning while she’s out here struggling with CLAT after her own lawyer father finally looked at the mess and said 
                    “fuck it, you’re Delhi’s problem now.” Even Daddy gave up on you. And somehow between failing to study you still found time to get some another guy sucking those pink, pointy little nipples like they were the last juice boxes on earth.
                </p>

                <button
                    type="button"
                    className="donation-joke__button"
                >
                    ANYWAYS, FUND THE GTA 6 GOON CAVE
                </button>
            </div>

            <div className="donation-joke__stamp">
                W+
            </div>
        </section>
    );
}