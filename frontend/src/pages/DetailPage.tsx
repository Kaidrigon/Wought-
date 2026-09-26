import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";
import DetailHero from "../components/detail/DetailHero";
import DetailInformation from "../components/detail/DetailInformation";
import DetailPeople from "../components/detail/DetailPeople";
import {
    getDetails,
    getTVSeason,
    generateRoast,
} from "../services/api/detailsApi";
import {
    getCachedRoast,
    saveRoast,
} from "../utils/roastCache";
import type {
    DetailsData,
    DetailsType,
} from "../types/details";
import type { SeasonData } from "../types/seasons";
import RecommendationSection from "./RecommendationSection";
import "./DetailPage.css";
import "./DetailSeasonPage.css";

export default function DetailPage() {
    const {
        id,
        tv_id: tvId,
        season_number: seasonNumber,
    } = useParams();

    const location = useLocation();
    const navigate = useNavigate();

    const { section } = useTheme();

    const isAnime = section === "anime";

    const isSeasonPage = Boolean(
        tvId && seasonNumber
    );

    const isTV =
        !isAnime &&
        (
            location.pathname.includes("/tv/") ||
            isSeasonPage
        );

    const [data, setData] =
        useState<DetailsData | null>(null);

    const [seasonData, setSeasonData] =
        useState<SeasonData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [roast, setRoast] =
        useState<string | null>(null);

    const [roastStatus, setRoastStatus] =
        useState("");

    const [displayDescription, setDisplayDescription] =
        useState("");

    const [isRoastRevealing, setIsRoastRevealing] =
        useState(false);

    const [seasonsExpanded, setSeasonsExpanded] =
        useState(false);

    const [castExpanded, setCastExpanded] =
        useState(false);

    const [crewExpanded, setCrewExpanded] =
        useState(false);

    const basePath =
        isAnime ? "anime" : "cinema";

    const mediaType: DetailsType =
        isAnime
            ? "anime"
            : isTV
                ? "tv"
                : "movie";

    const pageClass = `detail-page ${
        isAnime
            ? "detail-page--anime"
            : "detail-page--cinema"
    }`;

    /* ----------------------------- */
    /* LOAD DATA                      */
    /* ----------------------------- */

    useEffect(() => {
        let cancelled = false;

        async function loadDetail() {
            setLoading(true);
            setError("");
            setData(null);
            setSeasonData(null);

            /*
             * SEASON PAGE
             *
             * Season pages are handled separately from
             * the normal movie / TV / anime detail page.
             */

            if (isSeasonPage) {
                const numericTVId = Number(tvId);
                const numericSeason = Number(seasonNumber);

                if (
                    !Number.isFinite(numericTVId) ||
                    !Number.isFinite(numericSeason)
                ) {
                    setError(
                        "Invalid season information."
                    );

                    setLoading(false);

                    return;
                }

                try {
                    const result =
                        await getTVSeason(
                            numericTVId,
                            numericSeason
                        );

                    if (!cancelled) {
                        setSeasonData(result);
                    }
                } catch (seasonError) {
                    if (!cancelled) {
                        setError(
                            seasonError instanceof Error
                                ? seasonError.message
                                : "Unable to load this season."
                        );
                    }
                } finally {
                    if (!cancelled) {
                        setLoading(false);
                    }
                }

                return;
            }

            /*
             * NORMAL DETAIL PAGE
             */

            if (!id) {
                setError("Missing content ID.");
                setLoading(false);

                return;
            }

            const numericId = Number(id);

            if (!Number.isFinite(numericId)) {
                setError("Invalid content ID.");
                setLoading(false);

                return;
            }

            setRoast(null);
            setRoastStatus("");
            setDisplayDescription("");
            setIsRoastRevealing(false);
            setSeasonsExpanded(false);
            setCastExpanded(false);
            setCrewExpanded(false);
            try {
                const result =
                    await getDetails(
                        mediaType,
                        numericId
                    );

                if (cancelled) {
                    return;
                }

                setData(result);

                setDisplayDescription(
                    result.description ?? ""
                );
            } catch (detailError) {
                if (!cancelled) {
                    setError(
                        detailError instanceof Error
                            ? detailError.message
                            : "Dont tell me you need some tutorials even for this."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDetail();

        return () => {
            cancelled = true;
        };
    }, [
        id,
        tvId,
        seasonNumber,
        isAnime,
        isTV,
        isSeasonPage,
        mediaType,
    ]);

    /* ----------------------------- */
/* ROAST                          */
/* ----------------------------- */

useEffect(() => {
    if (
        isSeasonPage ||
        !data?.description
    ) {
        return;
    }

    const description = data.description;

    let contentId: number;

    if (isAnime) {
        if (data.anilist_id == null) {
            return;
        }

        contentId = data.anilist_id;
    } else {
        if (data.tmdb_id == null) {
            return;
        }

        contentId = data.tmdb_id;
    }

    const title =
        data.title ||
        data.romaji_title ||
        null;

    let cancelled = false;

    async function loadRoast() {
        /*
         * The original description is already visible.
         *
         * We don't replace it with a loading message.
         * Instead, the status becomes part of the roast
         * experience underneath the description.
         */
        setRoastStatus("so much generic shit");

        const cachedRoast =
            getCachedRoast(
                contentId,
                mediaType
            );

        /*
         * Cached roast:
         *
         * We still pass it through the exact same reveal
         * animation as a freshly generated roast.
         */
        if (cachedRoast) {
            if (!cancelled) {
                setRoast(cachedRoast);
            }

            return;
        }

        /*
         * No cached roast exists.
         *
         * Generate a new one.
         */
        try {
            const result =
                await generateRoast(
                    description,
                    title,
                    mediaType
                );

            saveRoast(
                contentId,
                result,
                mediaType
            );

            if (!cancelled) {
                setRoast(result);
            }
        } catch (roastError) {
            console.error(
                "Wought+ roast failed:",
                roastError
            );

            if (!cancelled) {
                setRoast(null);
                setRoastStatus("");
                setIsRoastRevealing(false);
                setDisplayDescription(description);
            }
        }
    }

    loadRoast();

    return () => {
        cancelled = true;
    };
}, [
    data,
    mediaType,
    isAnime,
    isSeasonPage,
]);


/* ----------------------------- */
/* ROAST REVEAL                   */
/* ----------------------------- */

useEffect(() => {
    if (
        !roast ||
        !data?.description ||
        isSeasonPage
    ) {
        return;
    }

    const original =
        data.description;

    let cancelled = false;
    let statusTimeout: number | undefined;

    setIsRoastRevealing(true);

    /*
     * PHASE 1:
     *
     * The original description is being erased.
     * This is where we roast the generic slop.
     */
    setRoastStatus("ew what a generic slop");

    const revealDelay =
        window.setTimeout(() => {
            if (cancelled) {
                return;
            }

            const totalSteps = Math.max(
                original.length,
                roast.length
            );

            let progress = 0;

            /*
             * The original must be COMPLETELY gone
             * before the roast starts appearing.
             */
            const deletionEnd =
                totalSteps * 0.55;

            let roastStatusShown = false;

            const interval =
                window.setInterval(() => {
                    if (cancelled) {
                        window.clearInterval(
                            interval
                        );

                        return;
                    }

                    progress += 1;

                    /*
                     * FINISHED
                     */
                    if (
                        progress >=
                        totalSteps
                    ) {
                        window.clearInterval(
                            interval
                        );

                        setDisplayDescription(
                            roast
                        );

                        setIsRoastRevealing(
                            false
                        );

                        setRoastStatus(
                            "yeah this is better"
                        );

                        /*
                         * Keep the final message
                         * around for one minute.
                         */
                        statusTimeout =
                            window.setTimeout(() => {
                                if (!cancelled) {
                                    setRoastStatus("");
                                }
                            }, 60000);

                        return;
                    }

                    /*
                     * PHASE 1
                     *
                     * Erase the original description.
                     *
                     * During this entire phase:
                     *
                     * "ew what a generic slop"
                     */
                    if (
                        progress <
                        deletionEnd
                    ) {
                        const deletionProgress =
                            Math.min(
                                1,
                                progress /
                                    Math.max(
                                        1,
                                        deletionEnd
                                    )
                            );

                        const originalVisibleLength =
                            Math.floor(
                                original.length *
                                    (1 -
                                        deletionProgress)
                            );

                        setDisplayDescription(
                            original.slice(
                                0,
                                originalVisibleLength
                            )
                        );

                        return;
                    }

                    /*
                     * PHASE 2
                     *
                     * The original is now gone.
                     *
                     * NOW we switch the status to:
                     *
                     * "wait let me cook"
                     */
                    if (!roastStatusShown) {
                        roastStatusShown = true;

                        setRoastStatus(
                            "wait let me cook"
                        );
                    }

                    /*
                     * Reveal the roast from zero.
                     */
                    const roastProgress =
                        Math.min(
                            1,
                            (progress -
                                deletionEnd) /
                                Math.max(
                                    1,
                                    totalSteps -
                                        deletionEnd
                                )
                        );

                    const roastVisibleLength =
                        Math.floor(
                            roast.length *
                                roastProgress
                        );

                    setDisplayDescription(
                        roast.slice(
                            0,
                            roastVisibleLength
                        )
                    );
                }, 28);

            return () => {
                window.clearInterval(
                    interval
                );
            };
        }, 350);

    return () => {
        cancelled = true;

        window.clearTimeout(
            revealDelay
        );

        if (
            statusTimeout !== undefined
        ) {
            window.clearTimeout(
                statusTimeout
            );
        }
    };
}, [
    roast,
    data?.description,
    isSeasonPage,
]);

    /* ----------------------------- */
    /* NAVIGATION                     */
    /* ----------------------------- */

    function openSeason(season: number) {
        if (!data?.tmdb_id) {
            return;
        }

        navigate(
            `/${basePath}/tv/${data.tmdb_id}/season/${season}`
        );
    }

    function returnToTV() {
        const currentTVId =
            seasonData?.tv_id ||
            data?.tmdb_id;

        if (!currentTVId) {
            navigate(-1);
            return;
        }

        navigate(
            `/${basePath}/tv/${currentTVId}`
        );
    }

    function openPerson(personId: number) {
        if (!personId) {
            return;
        }

        navigate(
            `/${basePath}/person/${personId}`
        );
    }

    /*
     * WATCH / MY LIST
     *
     * Placeholder handlers -- wire these up to your
     * actual player route / watchlist logic.
     */

    function handleWatch() {
        if (!data) {
            return;
        }

        const contentId =
            isAnime ? data.anilist_id : data.tmdb_id;

        if (!contentId) {
            return;
        }

        navigate(
            `/${basePath}/${mediaType}/${contentId}/watch`
        );
    }

    function handleAddToList() {
        if (!data) {
            return;
        }

        // TODO: hook this up to your actual "My List" logic.
        console.log(
            "add to list:",
            data.title || data.romaji_title
        );
    }

    /* ----------------------------- */
    /* LOADING                        */
    /* ----------------------------- */

    if (loading) {
        return (
            <main className={pageClass}>
                <div className="detail-loading">
                    <div className="detail-loading__orb" />

                    <p>
                        i am trying my best to load faster alright
                    </p>
                </div>
            </main>
        );
    }

    /* ----------------------------- */
    /* ERROR                          */
    /* ----------------------------- */

    if (
        error ||
        (!data && !seasonData)
    ) {
        return (
            <main className={pageClass}>
                <div className="detail-error">
                    <span>404</span>

                    <h1>
                        You broke it.
                    </h1>

                    <p>
                        i built this entire site with my own thumb
                        licking, pp jorking hands and THIS is how you
                        repay me? just go home you broke my heart a
                        little
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(-1)
                        }
                    >
                        <ArrowLeft size={17} />
                        Go back
                    </button>
                </div>
            </main>
        );
    }

    /* ----------------------------- */
    /* SEASON PAGE                    */
    /* ----------------------------- */

    if (
        isSeasonPage &&
        seasonData
    ) {
        return (
            <main className={pageClass}>
                <motion.section
                    className="detail-information detail-season-page"
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                >
                    <button
                        type="button"
                        onClick={returnToTV}
                        className="detail-season-page__back"
                    >
                        <ArrowLeft size={17} />
                        Back to series
                    </button>

                    <div className="detail-season-page__header">
                        {seasonData.poster_link && (
                            <img
                                src={
                                    seasonData.poster_link
                                }
                                alt={
                                    seasonData.name
                                }
                                className="detail-season-page__poster"
                            />
                        )}

                        <div>
                            <SectionHeading>
                                SEASON{" "}
                                {
                                    seasonData.season_number
                                }
                            </SectionHeading>

                            <h1>
                                {seasonData.name}
                            </h1>

                            {seasonData.air_date && (
                                <p>
                                    {
                                        seasonData.air_date
                                    }
                                </p>
                            )}

                            {seasonData.overview && (
                                <p>
                                    {
                                        seasonData.overview
                                    }
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="detail-season-episodes">
                        <SectionHeading>
                            EPISODES
                        </SectionHeading>

                        <div className="detail-season-episodes__list">
                            {seasonData.episodes.map(
                                (episode) => (
                                    <article
                                        key={
                                            episode.id
                                        }
                                        className="detail-season-episode"
                                    >
                                        {episode.still_link && (
                                            <img
                                                src={
                                                    episode.still_link
                                                }
                                                alt=""
                                            />
                                        )}

                                        <div>
                                            <small>
                                                EPISODE{" "}
                                                {
                                                    episode.episode_number
                                                }
                                            </small>

                                            <h3>
                                                {
                                                    episode.name
                                                }
                                            </h3>

                                            {episode.overview && (
                                                <p>
                                                    {
                                                        episode.overview
                                                    }
                                                </p>
                                            )}

                                            <div>
                                                {episode.air_date && (
                                                    <span>
                                                        {
                                                            episode.air_date
                                                        }
                                                    </span>
                                                )}

                                                {episode.runtime && (
                                                    <span>
                                                        {
                                                            episode.runtime
                                                        }{" "}
                                                        min
                                                    </span>
                                                )}

                                                {episode.rating !=
                                                    null && (
                                                    <span>
                                                        ★{" "}
                                                        {episode.rating.toFixed(
                                                            1
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>
        );
    }

    /*
     * At this point this is guaranteed to be
     * the normal detail page.
     */

    if (!data) {
        return null;
    }

    /* ----------------------------- */
    /* SAFE OPTIONAL DATA             */
    /* ----------------------------- */

    const cast = data.cast ?? [];
    const crew = data.crew ?? [];

    return (
        <main className={pageClass}>
            {/* HERO */}

            <DetailHero
    data={data}
    displayDescription={
        displayDescription
    }
    isRoastRevealing={
        isRoastRevealing
    }
    roastStatus={
        roastStatus
    }
    onWatch={handleWatch}
    onAddToList={handleAddToList}
/>

            {/* INFORMATION */}

            <DetailInformation
                data={data}
                isAnime={isAnime}
                isTV={isTV}
                seasonsExpanded={
                    seasonsExpanded
                }
                onToggleSeasons={() =>
                    setSeasonsExpanded(
                        (previous) =>
                            !previous
                    )
                }
                onOpenSeason={
                    openSeason
                }
            />

            {/* CAST */}

            {cast.length > 0 && (
                <DetailPeople
                    title="CAST"
                    people={cast.slice(0, 12)}
                    expanded={castExpanded}
                    onToggle={() =>
                        setCastExpanded(
                            (previous) =>
                                !previous
                        )
                    }
                    onPersonClick={
                        openPerson
                    }
                    getSubtitle={(person) =>
                        person.character
                    }
                />
            )}

            {/* CREW */}

            {crew.length > 0 && (
                <DetailPeople
                    title="CREW"
                    people={crew.slice(0, 12)}
                    expanded={crewExpanded}
                    onToggle={() =>
                        setCrewExpanded(
                            (previous) =>
                                !previous
                        )
                    }
                    onPersonClick={
                        openPerson
                    }
                    getSubtitle={(person) =>
                        person.job ||
                        person.department
                    }
                />
            )}

            {/* RECOMMENDATIONS */}

            {(
                (isAnime &&
                    data.anilist_id != null) ||
                (!isAnime &&
                    data.tmdb_id != null)
            ) && (
                <RecommendationSection
                    type={mediaType}
                    id={
                        isAnime
                            ? data.anilist_id!
                            : data.tmdb_id!
                    }
                />
            )}
        </main>
    );
}

/* SMALL LOCAL COMPONENT */

function SectionHeading({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="detail-information__heading">
            <span />
            <p>{children}</p>
        </div>
    );
}