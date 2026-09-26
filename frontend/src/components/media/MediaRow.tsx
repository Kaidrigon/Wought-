import type { HeroData } from "../../types/hero";

import MediaCard from "./MediaCard";

import "./MediaRow.css";


type MediaRowProps = {
    media: HeroData[];
};


export default function MediaRow({
    media,
}: MediaRowProps) {

    return (

        <div className="media-row">

            <div className="media-row__track">

                {media.map(item => (

                    <MediaCard
                        key={`${item.media_type}-${item.tmdb_id}`}
                        media={item}
                    />

                ))}

            </div>

        </div>

    );

}