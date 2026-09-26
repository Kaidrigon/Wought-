import { useNowPlaying } from "../../hooks/useNowPlaying";

import MediaRow from "../media/MediaRow";

import "./NowPlayingSection.css";


export default function NowPlayingSection() {

    const {
        nowPlaying,
        loading,
        error,
    } = useNowPlaying();


    if (loading) {

        return (

            <section className="now-playing-section">

                <div className="now-playing-section__header">

                    <div className="now-playing-section__eyebrow">
                        NOW PLAYING
                    </div>

                    <h2 className="now-playing-section__title">
                        Coz imagine being a broke ass but 
                        still wanna see that high visual shit. 
                    </h2>

                </div>

            </section>

        );

    }


    if (
        error ||
        nowPlaying.length === 0
    ) {

        return null;

    }


    return (

        <section className="now-playing-section">

            <div className="now-playing-section__header">

                <div className="now-playing-section__eyebrow">
                    NOW PLAYING
                </div>


                <h2 className="now-playing-section__title">

                    Coz imagine being a broke ass but 
                    still wanna see that high visual shit. 

                </h2>

            </div>


            <MediaRow
                media={nowPlaying}
            />

        </section>

    );

}