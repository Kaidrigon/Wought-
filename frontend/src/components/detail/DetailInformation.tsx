import { motion } from "framer-motion";

import { ChevronDown } from "lucide-react";

import "../detail/DetailInformation.css";

import type {
DetailsData,
DetailsSeason,
} from "../../types/details";

type DetailInformationProps = {
data: DetailsData;
isAnime: boolean;
isTV: boolean;
seasonsExpanded: boolean;
onToggleSeasons: () => void;
onOpenSeason: (season: number) => void;
};

export default function DetailInformation({
data,
isAnime,
isTV,
seasonsExpanded,
onToggleSeasons,
onOpenSeason,
}: DetailInformationProps) {
const studios = data.studios ?? [];
const seasons = data.seasons ?? [];

return (
    <motion.section
        className="detail-information"
        initial={{
            opacity: 0,
            y: 20,
        }}
        animate={{
            opacity: 1,
            y: 0,
        }}
        transition={{
            duration: 0.6,
            delay: 0.35,
        }}
    >
        <SectionHeading>
            {isAnime
                ? "ARCHIVE DATA"
                : "ABOUT THIS TITLE"}
        </SectionHeading>

        <div className="detail-information__grid">
            <InfoItem
                label="Status"
                value={data.status || "Unknown"}
            />

            <InfoItem
                label="Language"
                value={data.language || "Unknown"}
            />

            {isAnime && studios.length > 0 && (
                <InfoItem
                    label="Studio"
                    value={studios.join(", ")}
                />
            )}

            {isAnime && data.episodes != null && (
                <InfoItem
                    label="Episodes"
                    value={data.episodes}
                />
            )}

            {!isAnime &&
                isTV &&
                data.number_of_seasons != null && (
                    <button
                        type="button"
                        className={`detail-information__item ${
                            seasonsExpanded
                                ? "detail-information__item--expanded"
                                : ""
                        }`}
                        onClick={onToggleSeasons}
                        aria-expanded={seasonsExpanded}
                    >
                        <span className="detail-information__item-top">
                            <small>Seasons</small>

                            <ChevronDown
                                size={16}
                                className="detail-information__season-icon"
                            />
                        </span>

                        <strong>
                            {data.number_of_seasons}
                        </strong>

                        <span className="detail-information__item-hint">
                            {seasonsExpanded
                                ? "Hide seasons"
                                : "View seasons"}
                        </span>
                    </button>
                )}

            {!isAnime &&
                isTV &&
                data.number_of_episodes != null && (
                    <InfoItem
                        label="Episodes"
                        value={data.number_of_episodes}
                    />
                )}
        </div>

        {!isAnime &&
            isTV &&
            seasonsExpanded &&
            seasons.length > 0 && (
                <motion.div
                    className="detail-seasons"
                    initial={{
                        opacity: 0,
                        height: 0,
                        y: -8,
                    }}
                    animate={{
                        opacity: 1,
                        height: "auto",
                        y: 0,
                    }}
                    transition={{
                        duration: 0.3,
                    }}
                >
                    <div className="detail-seasons__header">
                        <SectionHeading>
                            AVAILABLE SEASONS
                        </SectionHeading>

                        <span>
                            {seasons.length} total
                        </span>
                    </div>

                    <div className="detail-seasons__grid">
                        {seasons.map(
                            (
                                season: DetailsSeason
                            ) => (
                                <button
                                    key={
                                        season.season_number
                                    }
                                    type="button"
                                    className="detail-season-card"
                                    onClick={() =>
                                        onOpenSeason(
                                            season.season_number
                                        )
                                    }
                                >
                                    <div className="detail-season-card__poster">
                                        {season.poster_link ? (
                                            <img
                                                src={
                                                    season.poster_link
                                                }
                                                alt=""
                                            />
                                        ) : (
                                            <div className="detail-season-card__placeholder">
                                                S
                                                {
                                                    season.season_number
                                                }
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-season-card__content">
                                        <div>
                                            <small>
                                                SEASON{" "}
                                                {
                                                    season.season_number
                                                }
                                            </small>

                                            <strong>
                                                {
                                                    season.name
                                                }
                                            </strong>
                                        </div>

                                        {season.episode_count !=
                                            null && (
                                            <span>
                                                {
                                                    season.episode_count
                                                }{" "}
                                                episodes
                                            </span>
                                        )}
                                    </div>

                                    <ChevronDown
                                        size={16}
                                        className="detail-season-card__icon"
                                    />
                                </button>
                            )
                        )}
                    </div>
                </motion.div>
            )}
    </motion.section>
);

}

/* ================================================= */
/* SMALL LOCAL COMPONENTS                            */
/* ================================================= */

function SectionHeading({
children,
}: {
children: React.ReactNode;
}) {
return ( <div className="detail-information__heading"> 

<span /> <p>{children}</p> </div>
);
}

function InfoItem({
label,
value,
}: {
label: string;
value: React.ReactNode;
}) {
return ( <div> 
    
    <small>{label}</small> 
    
    <strong>{value}</strong> 
    
</div>
);
}