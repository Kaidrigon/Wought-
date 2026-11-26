import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Bug,
    Mail,
    Shield,
    Zap,
    FileText,
} from "lucide-react";

import "./DMCA.css";

type Experience = "cinema" | "anime";

const bugMessages = [
    "BUG_001: You found something. Please pretend you didn't.",
    "BUG_002: Our legal department has requested a raise.",
    "BUG_003: Netflix has entered the chat. We recommend running.",
    "SYSTEM: This bug has unionized.",
    "ERROR 418: I'm a teapot. And possibly a copyright infringement.",
    "CONFIDENTIAL: Management is currently unavailable. Again.",
];

/* ---------- bug hunt settings ---------- */

const TOTAL_BUGS = bugMessages.length; // 6 -> the last one is the "boss" bug
const STORAGE_KEY = "wplus:dmca:all-bugs-caught";

// Where people get sent once every bug is caught.
// A web page is NOT allowed to open the visitor's own browser homepage, so
// "about:blank" (an empty tab) is the closest thing. Swap it for any URL
// you like, e.g. "https://www.google.com".
const EXIT_URL = "about:blank";

const CORRUPT_GLYPHS = "█▓▒░#@$%&?!/\\<>[]{}01";

type Finale = "idle" | "corrupting" | "deleting";

interface PurgeLine {
    text: string;
    delay: number;
    tone?: "error";
}

// Pure theatre: nothing is deleted. It's only text on a black screen.
const PURGE_LINES: PurgeLine[] = [
    { text: "wought+ // maintenance daemon", delay: 500 },
    { text: "anomalies detected: 6 / 6", delay: 600 },
    { text: "containment failed.", delay: 700, tone: "error" },
    { text: "initiating purge...", delay: 800 },
    { text: "deleting /catalog/movies ............ done", delay: 450 },
    { text: "deleting /catalog/anime ............. done", delay: 450 },
    { text: "deleting /legal/dmca ................ done", delay: 450 },
    { text: "deleting /legal/the_real_deal ....... done", delay: 450 },
    { text: "deleting /users/everyone ............ done", delay: 550 },
    { text: "deleting /backups ................... what backups?", delay: 700 },
    { text: "deleting /server .................... ", delay: 900 },
    { text: "warning: this is taking longer than expected.", delay: 900 },
    { text: "error: nothing left to delete.", delay: 800, tone: "error" },
    { text: "goodbye.", delay: 900 },
];

const readCaughtFlag = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

const writeCaughtFlag = (value: boolean) => {
    try {
        if (value) window.localStorage.setItem(STORAGE_KEY, "1");
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* storage blocked - the hunt still works, only the welcome-back is lost */
    }
};

export default function DMCAPage() {
    const [experience, setExperience] = useState<Experience | null>(null);
    const [opened, setOpened] = useState(false);
    const [opening, setOpening] = useState(false);
    const [bugMessage, setBugMessage] = useState("");
    const [discoveredBugs, setDiscoveredBugs] = useState<number[]>([]);
    const [finale, setFinale] = useState<Finale>("idle");
    const [welcomeBack, setWelcomeBack] = useState<boolean>(() =>
        readCaughtFlag()
    );
    const pageRef = useRef<HTMLElement | null>(null);

    const isAnime = experience === "anime";

    const showBoss =
        isAnime &&
        opened &&
        finale === "idle" &&
        discoveredBugs.length === TOTAL_BUGS - 1 &&
        !discoveredBugs.includes(TOTAL_BUGS - 1);

    /* toast auto-hide */
    useEffect(() => {
        if (!bugMessage) return;
        const timer = window.setTimeout(() => setBugMessage(""), 4200);
        return () => window.clearTimeout(timer);
    }, [bugMessage]);

    /* every bug caught -> start the finale */
    useEffect(() => {
        if (finale !== "idle" || discoveredBugs.length < TOTAL_BUGS) return;

        const timer = window.setTimeout(() => {
            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;
            setFinale(reduceMotion ? "deleting" : "corrupting");
        }, 1400);

        return () => window.clearTimeout(timer);
    }, [discoveredBugs, finale]);

    /* phase 1: the page text slowly corrupts */
    useEffect(() => {
        if (finale !== "corrupting") return;

        const root = pageRef.current;
        if (!root) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const targets: { node: Text; original: string }[] = [];
        let current = walker.nextNode();

        while (current) {
            const node = current as Text;
            const text = node.nodeValue;
            if (text && text.trim()) targets.push({ node, original: text });
            current = walker.nextNode();
        }

        let tick = 0;
        const scramble = window.setInterval(() => {
            tick += 1;
            const intensity = Math.min(1, tick / 20);

            for (const { node, original } of targets) {
                node.nodeValue = original.replace(/\S/g, (char) =>
                    Math.random() < intensity * 0.85
                        ? CORRUPT_GLYPHS[
                              Math.floor(Math.random() * CORRUPT_GLYPHS.length)
                          ]
                        : char
                );
            }
        }, 120);

        const next = window.setTimeout(() => setFinale("deleting"), 2800);

        return () => {
            window.clearInterval(scramble);
            window.clearTimeout(next);
        };
    }, [finale]);

    /* phase 2: remember that they did it, so we can greet them on return */
    useEffect(() => {
        if (finale === "deleting") writeCaughtFlag(true);
    }, [finale]);

    /* back/forward cache: reload so the welcome-back message can play */
    useEffect(() => {
        const onShow = (event: PageTransitionEvent) => {
            if (event.persisted && readCaughtFlag()) window.location.reload();
        };
        window.addEventListener("pageshow", onShow);
        return () => window.removeEventListener("pageshow", onShow);
    }, []);

    const leaveSite = () => {
        window.location.assign(EXIT_URL);

        // If the browser refuses the navigation, reload instead so the
        // welcome-back message still plays.
        window.setTimeout(() => window.location.reload(), 2500);
    };

    const dismissWelcome = () => {
        writeCaughtFlag(false);
        setWelcomeBack(false);
    };

    const chooseExperience = (choice: Experience) => {
        setExperience(choice);
        setOpened(false);
        setOpening(false);
        setBugMessage("");
        setDiscoveredBugs([]);
    };

    const returnToChoice = () => {
        setExperience(null);
        setOpened(false);
        setOpening(false);
        setBugMessage("");
        setDiscoveredBugs([]);
    };

    const openEnvelope = () => {
        if (opening) return;

        setOpening(true);

        window.setTimeout(() => {
            setOpened(true);
            setOpening(false);
        }, 900);
    };

    const switchDocument = (choice: Experience) => {
        setExperience(choice);
        setOpened(true);
        setOpening(false);
        setBugMessage("");
    };

    const discoverBug = (index: number) => {
        if (discoveredBugs.includes(index)) return;

        const next = [...discoveredBugs, index];
        setDiscoveredBugs(next);
        setBugMessage(bugMessages[index]);

        if (next.length === TOTAL_BUGS - 1) {
            window.setTimeout(
                () =>
                    setBugMessage(
                        "SYSTEM: ONE ANOMALY REMAINS. IT HAS NOTICED YOU."
                    ),
                2600
            );
        }
    };

    return (
        <main
            ref={pageRef}
            className={`dmca-page ${
                experience ? `dmca-page--${experience}` : ""
            } ${finale === "corrupting" ? "dmca-page--corrupt" : ""}`}
        >
            <div className="dmca-noise" />
            <div className="dmca-background-glow" />

            <AnimatePresence mode="wait">
                {!experience ? (
                    <motion.section
                        key="choice"
                        className="dmca-choice"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{ duration: 0.45 }}
                    >
                        <div className="dmca-choice__eyebrow">
                            <span className="dmca-live-dot" />
                            WOUGHT+ / LEGAL DEPARTMENT
                        </div>

                        <div className="dmca-choice__heading">
                            <span>WE HAVE</span>
                            <h1>A LETTER FOR YOU.</h1>
                            <p>
                                Unfortunately, we're not sure which one.
                            </p>
                        </div>

                        <div className="dmca-choice__options">
                            <motion.button
                                className="dmca-choice-card dmca-choice-card--cinema"
                                onClick={() => chooseExperience("cinema")}
                                whileHover={{ y: -7 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <div className="dmca-choice-card__top">
                                    <Mail size={25} />
                                    <span>01 / CORPORATE</span>
                                </div>

                                <div className="dmca-choice-card__visual">
                                    <div className="dmca-choice-card__seal">
                                        W+
                                    </div>
                                    <div className="dmca-choice-card__line" />
                                    <div className="dmca-choice-card__line dmca-choice-card__line--short" />
                                </div>

                                <div className="dmca-choice-card__bottom">
                                    <div>
                                        <h2>Just sweet little jokes</h2>
                                        <p>
                                            A perfectly ordinary legal document.
                                            Nothing to see here.
                                        </p>
                                    </div>

                                    <ArrowRight size={22} />
                                </div>
                            </motion.button>

                            <motion.button
                                className="dmca-choice-card dmca-choice-card--anime"
                                onClick={() => chooseExperience("anime")}
                                whileHover={{ y: -7 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <div className="dmca-choice-card__top">
                                    <Bug size={25} />
                                    <span>02 / RESTRICTED</span>
                                </div>

                                <div className="dmca-choice-card__visual dmca-choice-card__visual--glitch">
                                    <span>W+_SYS</span>
                                    <span className="dmca-glitch-text">
                                        ACCESS?
                                    </span>
                                    <span>ERROR_001</span>
                                </div>

                                <div className="dmca-choice-card__bottom">
                                    <div>
                                        <h2>The real deal</h2>
                                        <p>
                                            You've been warned. Well, not
                                            officially.
                                        </p>
                                    </div>

                                    <ArrowRight size={22} />
                                </div>
                            </motion.button>
                        </div>

                        <div className="dmca-choice__footer">
                            <span>W+ / DOCUMENT ARCHIVE</span>
                            <span>PLEASE READ RESPONSIBLY*</span>
                        </div>
                    </motion.section>
                ) : !opened ? (
                    <motion.section
                        key={`envelope-${experience}`}
                        className={`dmca-envelope-stage dmca-envelope-stage--${experience}`}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.45 }}
                    >
                        <button
                            className="dmca-back"
                            onClick={returnToChoice}
                        >
                            <ArrowLeft size={16} />
                            Back to selection
                        </button>

                        <div className="dmca-envelope-stage__heading">
                            <span>
                                {isAnime
                                    ? "RESTRICTED TRANSMISSION"
                                    : "CORPORATE CORRESPONDENCE"}
                            </span>

                            <h1>
                                {isAnime
                                    ? "You've accessed something."
                                    : "A little something for you."}
                            </h1>

                            <p>
                                {isAnime
                                    ? "We don't remember sending this."
                                    : "Please accept our extremely important correspondence."}
                            </p>
                        </div>

                        <motion.button
                            className={`dmca-envelope dmca-envelope--${experience} ${
                                opening ? "dmca-envelope--opening" : ""
                            }`}
                            onClick={openEnvelope}
                            whileHover={!opening ? { scale: 1.035 } : undefined}
                            whileTap={!opening ? { scale: 0.97 } : undefined}
                            aria-label="Open the DMCA envelope"
                            disabled={opening}
                        >
                            <div className="dmca-envelope__shadow" />

                            <div className="dmca-envelope__paper">
                                <FileText size={30} />
                                <span>
                                    {isAnime
                                        ? "CLASSIFIED"
                                        : "WOUGHT+ LEGAL"}
                                </span>
                            </div>

                            <div className="dmca-envelope__body" />

                            <div className="dmca-envelope__flap" />

                            <div className="dmca-envelope__seal">
                                {isAnime ? (
                                    <Zap size={22} />
                                ) : (
                                    <span>W+</span>
                                )}
                            </div>
                        </motion.button>

                        <button
                            className="dmca-envelope-hint"
                            onClick={openEnvelope}
                            disabled={opening}
                        >
                            {opening
                                ? "OPENING CORRESPONDENCE..."
                                : isAnime
                                    ? "CLICK TO ACCESS TRANSMISSION"
                                    : "CLICK THE SEAL TO OPEN YOUR LETTER"}
                        </button>
                    </motion.section>
                ) : (
                    <motion.section
                        key={`document-${experience}`}
                        className={`dmca-document-stage dmca-document-stage--${experience}`}
                        initial={{ opacity: 0, y: 45, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                            duration: 0.65,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div className="dmca-document-toolbar">
                            <button
                                className="dmca-toolbar-button"
                                onClick={() => setOpened(false)}
                            >
                                <ArrowLeft size={16} />
                                Close letter
                            </button>

                            <span>
                                {isAnime
                                    ? "W+ / RESTRICTED ARCHIVE"
                                    : "W+ / CORPORATE ARCHIVE"}
                            </span>

                            <span className="dmca-document-status">
                                <span />
                                {isAnime
                                    ? `COMPROMISED // ${discoveredBugs.length}/${TOTAL_BUGS}`
                                    : "VERIFIED"}
                            </span>
                        </div>

                        <article className="dmca-document">
                            {isAnime ? (
                                <AnimeDocument
                                    found={discoveredBugs}
                                    onCatch={discoverBug}
                                />
                            ) : (
                                <CinemaDocument />
                            )}

                            <div className="dmca-document-switch">
                                <div>
                                    <span>LOOKING FOR SOMETHING ELSE?</span>
                                    <h3>
                                        {isAnime
                                            ? "Want the boring version?"
                                            : "Want something less boring?"}
                                    </h3>
                                </div>

                                <button
                                    onClick={() =>
                                        switchDocument(
                                            isAnime ? "cinema" : "anime"
                                        )
                                    }
                                >
                                    {isAnime
                                        ? "Just sweet little jokes"
                                        : "The real deal"}
                                    <ArrowRight size={17} />
                                </button>
                            </div>

                            <div className="dmca-document-footer">
                                <span>WOUGHT+ / LEGAL DIVISION</span>
                                <span>
                                    {isAnime
                                        ? "WE WERE NEVER HERE."
                                        : "END OF CORRESPONDENCE"}
                                </span>
                            </div>
                        </article>

                        <button
                            className="dmca-return"
                            onClick={returnToChoice}
                        >
                            <ArrowLeft size={15} />
                            Return to both documents
                        </button>
                    </motion.section>
                )}
            </AnimatePresence>

            {isAnime && opened && bugMessage && finale === "idle" && (
                <div className="dmca-bug-toast-wrap">
                    <motion.div
                        key={bugMessage}
                        className="dmca-bug-message"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Bug size={15} />
                        {bugMessage}
                    </motion.div>
                </div>
            )}

            {showBoss && <BossBug onCatch={() => discoverBug(TOTAL_BUGS - 1)} />}

            {finale === "deleting" &&
                createPortal(<PurgeScreen onDone={leaveSite} />, document.body)}

            {welcomeBack &&
                finale === "idle" &&
                createPortal(
                    <WelcomeBack onClose={dismissWelcome} />,
                    document.body
                )}
        </main>
    );
}

/* =========================================================
   CINEMA DOCUMENT
   ========================================================= */

function CinemaDocument() {
    return (
        <>
            <header className="dmca-document-header">
                <div className="dmca-document-brand">
                    <Shield size={24} />
                    <span>WOUGHT+</span>
                </div>

                <span>DOCUMENT 001 / CORPORATE</span>
            </header>

            <div className="dmca-document-title">
                <span>LEGAL / COPYRIGHT / POLICY</span>
                <h1>DMCA Policy</h1>
                <p>Copyright & Intellectual Property Notice</p>
            </div>

            <section className="dmca-document-section">
                <span className="dmca-section-number">01</span>
                <div>
                    <h2>Is Wought+ Legal?</h2>
                    <p>
                        Wought+ operates in a legal gray area. Copyright
                        laws vary significantly from country to country,
                        and the legality of streaming services can be
                        complex and subject to interpretation.
                    </p>
                    <p>
                        Wought+ does not host any content on our servers.
                        We simply provide links to media hosted on
                        third-party services that are publicly available
                        on the internet.
                    </p>
                </div>
            </section>

            <section className="dmca-document-section">
                <span className="dmca-section-number">02</span>
                <div>
                    <h2>Copyright Information</h2>
                    <p>
                        Copyright laws vary by jurisdiction. In some
                        countries, streaming content may be considered
                        legal for personal use, while in others it may
                        be prohibited.
                    </p>
                    <p>
                        Users should be aware of the copyright laws in
                        their respective countries and use Wought+ at
                        their own discretion and risk.
                    </p>
                </div>
            </section>

            <section className="dmca-document-section">
                <span className="dmca-section-number">03</span>
                <div>
                    <h2>DMCA Takedown Requests</h2>
                    <p>
                        If you believe that your copyrighted work has
                        been copied in a way that constitutes copyright
                        infringement, please submit a notification to
                        our designated Copyright Agent at:
                    </p>

                    <div className="dmca-email">
                        <span>DESIGNATED COPYRIGHT AGENT</span>
                        <strong>5pg43v9u@woughtplus.anonaddy.com</strong>
                    </div>

                    <p>
                        Please include the following information in
                        your notification:
                    </p>

                    <ul>
                        <li>
                            A physical or electronic signature of the
                            copyright owner or a person authorized to
                            act on their behalf.
                        </li>
                        <li>
                            Identification of the copyrighted work
                            claimed to have been infringed.
                        </li>
                        <li>
                            Identification of the material claimed to
                            be infringing or to be the subject of
                            infringing activity.
                        </li>
                        <li>
                            Your contact information, including your
                            address, telephone number, and email address.
                        </li>
                        <li>
                            A statement that you have a good faith
                            belief that the use of the material in the
                            manner complained of is not authorized by
                            the copyright owner, its agent, or the law.
                        </li>
                        <li>
                            A statement that the information in the
                            notification is accurate, and under penalty
                            of perjury, that you are authorized to act
                            on behalf of the copyright owner.
                        </li>
                    </ul>
                </div>
            </section>

            <section className="dmca-document-section">
                <span className="dmca-section-number">04</span>
                <div>
                    <h2>Disclaimer</h2>
                    <p>
                        Wought+ is not responsible for and has no
                        control over the content of any third-party
                        website. We do not host any content and have
                        no control over the nature, content, or
                        availability of those sites.
                    </p>
                    <p>
                        The inclusion of any links does not necessarily
                        imply a recommendation or endorsement of the
                        views expressed within them.
                    </p>
                    <p>
                        This site does not store any files on our
                        servers. We only link to media hosted by
                        third-party services.
                    </p>
                </div>
            </section>
        </>
    );
}

/* =========================================================
   BUG HUNT PIECES
   ========================================================= */

interface BugProps {
    found: number[];
    onCatch: (index: number) => void;
}

interface CollectibleBugProps extends BugProps {
    index: number;
    className?: string;
    size?: number;
    onPointerEnter?: (event: PointerEvent<HTMLButtonElement>) => void;
}

function CollectibleBug({
    index,
    found,
    onCatch,
    className = "dmca-bug",
    size = 18,
    onPointerEnter,
}: CollectibleBugProps) {
    return (
        <AnimatePresence>
            {!found.includes(index) && (
                <motion.button
                    type="button"
                    className={className}
                    onClick={() => onCatch(index)}
                    onPointerEnter={onPointerEnter}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 2.2, opacity: 0, rotate: 140 }}
                    transition={{ duration: 0.3 }}
                    aria-label={`Collect anomaly ${index + 1}`}
                >
                    <Bug size={size} />
                </motion.button>
            )}
        </AnimatePresence>
    );
}

/* section number that occasionally flickers into a bug */
function GlitchNumber({
    label,
    index,
    found,
    onCatch,
}: BugProps & { label: string; index: number }) {
    if (found.includes(index)) {
        return <span className="dmca-section-number">{label}</span>;
    }

    return (
        <button
            type="button"
            className="dmca-section-number dmca-glitch-number"
            onClick={() => onCatch(index)}
            aria-label="Collect anomaly 2"
        >
            <span className="dmca-glitch-number__digits">{label}</span>
            <Bug size={15} className="dmca-glitch-number__bug" />
        </button>
    );
}

/* bug that jumps away from a mouse pointer (3 times), then gives up */
function DodgingBug({ found, onCatch }: BugProps) {
    const [dodges, setDodges] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const dodge = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== "mouse" || dodges >= 3) return;

        setDodges((count) => count + 1);
        setOffset({
            x: (Math.random() - 0.5) * 220,
            y: (Math.random() - 0.5) * 110,
        });
    };

    return (
        <div className="dmca-bug-anchor dmca-bug-anchor--dodge">
            <motion.div
                animate={offset}
                transition={{ type: "spring", stiffness: 380, damping: 16 }}
            >
                <CollectibleBug
                    index={2}
                    found={found}
                    onCatch={onCatch}
                    onPointerEnter={dodge}
                />
            </motion.div>
        </div>
    );
}

/* bug that only shows up once the reader reaches the end and stays a moment */
function LurkingBug({ found, onCatch }: BugProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 1 });
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!inView || ready) return;
        const timer = window.setTimeout(() => setReady(true), 1800);
        return () => window.clearTimeout(timer);
    }, [inView, ready]);

    return (
        <div ref={ref} className="dmca-bug-anchor dmca-bug-anchor--lurk">
            {ready && (
                <CollectibleBug index={3} found={found} onCatch={onCatch} />
            )}
        </div>
    );
}

/* the last bug: fast, fixed to the screen, can't be ignored */
function BossBug({ onCatch }: { onCatch: () => void }) {
    const [position, setPosition] = useState({ x: 50, y: 50 });

    useEffect(() => {
        const timer = window.setInterval(() => {
            setPosition({
                x: 8 + Math.random() * 84,
                y: 14 + Math.random() * 72,
            });
        }, 850);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <motion.div
            className="dmca-boss"
            initial={{ left: "50%", top: "50%", opacity: 0 }}
            animate={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                opacity: 1,
            }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
        >
            <button
                type="button"
                className="dmca-bug dmca-bug--boss"
                onClick={onCatch}
                aria-label="Catch the last anomaly"
            >
                <Bug size={24} />
            </button>
        </motion.div>
    );
}

/* =========================================================
   FINALE: FAKE "DELETING EVERYTHING" + WELCOME BACK
   (purely visual - nothing is actually deleted)
   ========================================================= */

function PurgeScreen({ onDone }: { onDone: () => void }) {
    const [shown, setShown] = useState(0);
    const doneRef = useRef(onDone);

    useEffect(() => {
        doneRef.current = onDone;
    }, [onDone]);

    useEffect(() => {
        if (shown >= PURGE_LINES.length) {
            const finish = window.setTimeout(() => doneRef.current(), 1600);
            return () => window.clearTimeout(finish);
        }

        const next = window.setTimeout(
            () => setShown((count) => count + 1),
            PURGE_LINES[shown].delay
        );
        return () => window.clearTimeout(next);
    }, [shown]);

    return (
        <motion.div
            className="dmca-purge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            role="status"
        >
            <div className="dmca-purge__terminal">
                {PURGE_LINES.slice(0, shown).map((line, index) => (
                    <p
                        key={index}
                        className={`dmca-purge__line ${
                            line.tone ? `dmca-purge__line--${line.tone}` : ""
                        }`}
                    >
                        {"> "}
                        {line.text}
                    </p>
                ))}
                <span className="dmca-purge__cursor" />
            </div>

            <div className="dmca-purge__bar">
                <span
                    style={{ width: `${(shown / PURGE_LINES.length) * 100}%` }}
                />
            </div>
        </motion.div>
    );
}

function WelcomeBack({ onClose }: { onClose: () => void }) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <motion.div
            className="dmca-return-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dmca-return-title"
        >
            <div className="dmca-return-screen__inner">
                <span className="dmca-return-screen__eyebrow">
                    W+_SYS // SESSION RESTORED
                </span>

                <h2
                    id="dmca-return-title"
                    className="dmca-return-screen__title"
                    data-text="oh. you came back."
                >
                    oh. you came back.
                </h2>

                <p>yeah. this is what you get by catching all the bugs here.</p>

                <p className="dmca-return-screen__small">
                    (relax, nothing was actually deleted. the site is fine.
                    the bugs have been reported to management.)
                </p>

                <button type="button" onClick={onClose} autoFocus>
                    ok, fine
                </button>
            </div>
        </motion.div>
    );
}

/* =========================================================
   ANIME / PARODY DOCUMENT
   ========================================================= */

function AnimeDocument({ found, onCatch }: BugProps) {
    return (
        <>
            <header className="dmca-document-header">
                <div className="dmca-document-brand">
                    <Bug size={24} />
                    <span>WOUGHT+</span>
                </div>

                <span>DOCUMENT 001 / RESTRICTED</span>

                {/* bug 1: crawls along the header line */}
                <div className="dmca-bug-lane">
                    <CollectibleBug
                        index={0}
                        found={found}
                        onCatch={onCatch}
                        className="dmca-bug dmca-bug--crawl"
                    />
                </div>
            </header>

            <div className="dmca-document-title">
                <span>LEGAL / COPYRIGHT / NONSENSE</span>
                <h1>Wought+ DMCA Policy</h1>
                <p>
                    (a public service announcement for people who still
                    think copyright is real)
                </p>
            </div>

            <section className="dmca-document-section">
                <span className="dmca-section-number">01</span>
                <div>
                    <h2>Is Wought+ Legal?</h2>
                    <p>
                        Legal? Bitch we operate in the same gray area as
                        your dad's secret second family and the shit you
                        search at 3 a.m. Copyright laws change every time
                        some politician needs a new yacht. We don't host
                        a single goddamn frame. We just point at the free
                        shit already floating around the internet like a
                        used condom in a public pool.
                    </p>
                    <p>
                        If that makes your lawyer's dick soft, good.
                    </p>
                </div>
            </section>

            <section className="dmca-document-section">
                <GlitchNumber label="02" index={1} found={found} onCatch={onCatch} />
                <div>
                    <h2>Copyright Information</h2>
                    <p>
                        Copyright is a fairy tale rich people tell
                        themselves so they can keep charging you $15.99
                        a month for the same movie they already sold you
                        three times. Some countries say "personal use is
                        fine." Other countries say "we'll fuck your
                        credit score."
                    </p>
                    <p>
                        We don't give a single flying fuck which one you
                        live in. Use it. Don't use it. Cry about it.
                        Whatever. Your risk, not ours.
                    </p>
                </div>
            </section>

            <section className="dmca-document-section">
                <span className="dmca-section-number">03</span>
                <div>
                    <h2>DMCA Takedown Requests</h2>
                    <p>
                        Oh you think your "copyrighted work" got linked?
                        Aww.
                    </p>
                    <p>
                        Send your little temper tantrum to:
                    </p>

                    <div className="dmca-email">
                        <span>COMPLAINTS DEPARTMENT</span>
                        <strong>5pg43v9u@woughtplus.anonaddy.com</strong>
                    </div>

                    <p>
                        Include all the boring corporate bullshit so we
                        know you're a real cheeky adult:
                    </p>

                    <ul>
                        <li>
                            Your signature (or the signature of whoever
                            owns your ass).
                        </li>
                        <li>
                            What precious content you think got "stolen".
                        </li>
                        <li>
                            The exact link you're crying about.
                        </li>
                        <li>
                            Your address, phone, email (so we can
                            picture you sitting there refreshing your
                            inbox like a desperate little bitch).
                        </li>
                        <li>A "good faith" statement.</li>
                        <li>A perjury statement.</li>
                        <li>A photo of your mum naked.</li>
                        <li>
                            A rap song dissing Netflix, Prime Video and
                            all the other streaming services including
                            the one your bitchy-ass sister is currently
                            getting wet to.
                        </li>
                    </ul>

                    <p>
                        We'll read it when we're done jerking off.
                        Maybe.
                    </p>

                    {/* bug 3: runs away from the cursor */}
                    <DodgingBug found={found} onCatch={onCatch} />
                </div>
            </section>

            <section className="dmca-document-section">
                <span className="dmca-section-number">04</span>
                <div>
                    <h2>Disclaimer</h2>
                    <p>
                        We don't host shit.
                        <br />
                        We don't control shit.
                        <br />
                        We don't endorse shit.
                        <br />
                        We don't store shit.{" "}
                        <CollectibleBug
                            index={4}
                            found={found}
                            onCatch={onCatch}
                            className="dmca-bug-inline"
                            size={14}
                        />
                    </p>
                    <p>
                        We just link to third-party sites that already
                        have the files.
                    </p>
                    <p>
                        If that bothers you, go sue the actual host.
                        Or go outside. Or go fuck yourself. All three
                        work.
                    </p>
                </div>
            </section>

            <section className="dmca-document-section dmca-document-section--final">
                <span className="dmca-section-number">05</span>
                <div>
                    <h2>A final word.</h2>
                    <p>
                        And lastly, if you think the name is a little
                        familiar, then yeah, Prime Video, I stole it
                        from your show The Boys, so yeah, now you could
                        stop putting your fingers up your ass.
                    </p>

                    {/* bug 4: appears if you stay to the very end */}
                    <LurkingBug found={found} onCatch={onCatch} />
                </div>
            </section>
        </>
    );
}