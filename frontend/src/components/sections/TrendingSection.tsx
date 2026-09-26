import { useTrending } from "../../hooks/useTrending";

import MediaRow from "../media/MediaRow";

import "./TrendingSection.css";


export default function TrendingSection() {

    const {
        trending,
        loading,
        error,
    } = useTrending();


    if (loading) {

        return (

            <section className="trending-section">

                <div className="trending-section__header">

                    <div className="trending-section__eyebrow">
                        TRENDING
                    </div>

                    <h2 className="trending-section__title">
                        Coz why have an original thought
                        when you can just copy paste?
                    </h2>

                </div>

            </section>

        );

    }


    if (
        error ||
        trending.length === 0
    ) {

        return null;

    }


    return (

        <section className="trending-section">

            <div className="trending-section__header">

                <div className="trending-section__eyebrow">
                    TRENDING
                </div>


                <h2 className="trending-section__title">

                    Coz why have an original thought
                    when you can just copy paste?

                </h2>

            </div>


            <MediaRow
                media={trending}
            />

        </section>

    );

}