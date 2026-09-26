import { motion } from "framer-motion";

import { ChevronDown } from "lucide-react";

import type { DetailsPerson } from "../../types/details";

import "../detail/Detailpeople.css"

type DetailPeopleProps = {
    title: string;
    people: DetailsPerson[];
    expanded: boolean;
    onToggle: () => void;
    onPersonClick: (id: number) => void;
    getSubtitle: (
        person: DetailsPerson
    ) => string | null | undefined;
};

export default function DetailPeople({
    title,
    people,
    expanded,
    onToggle,
    onPersonClick,
    getSubtitle,
}: DetailPeopleProps) {
    return (
        <motion.section
            className="detail-information detail-people"
            initial={{
                opacity: 0,
                y: 20,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
        >
            {/* PEOPLE TOGGLE */}

            <button
                type="button"
                className={`detail-people__toggle ${
                    expanded
                        ? "detail-people__toggle--expanded"
                        : ""
                }`}
                onClick={onToggle}
                aria-expanded={expanded}
            >
                <div className="detail-people__toggle-left">
                    <span className="detail-people__toggle-line" />

                    <span className="detail-people__toggle-title">
                        {title}
                    </span>

                    <span className="detail-people__toggle-count">
                        {people.length}
                    </span>
                </div>

                <ChevronDown
                    size={18}
                    className="detail-people__toggle-icon"
                />
            </button>

            {/* PEOPLE CONTENT */}

            <motion.div
                className="detail-people__content"
                initial={false}
                animate={{
                    height: expanded
                        ? "auto"
                        : 0,
                    opacity: expanded
                        ? 1
                        : 0,
                }}
                transition={{
                    duration: 0.3,
                    ease: [
                        0.2,
                        0.8,
                        0.2,
                        1,
                    ],
                }}
                style={{
                    overflow: "hidden",
                }}
            >
                <div className="detail-people__grid">
                    {people.map((person) => {
                        const subtitle =
                            getSubtitle(person);

                        return (
                            <button
                                key={`${person.id}-${subtitle || title}`}
                                type="button"
                                className="detail-person-card"
                                onClick={() =>
                                    onPersonClick(
                                        person.id
                                    )
                                }
                                aria-label={`View ${person.name}`}
                            >
                                <div className="detail-person-card__image">
                                    {person.profile_link ? (
                                        <img
                                            src={
                                                person.profile_link
                                            }
                                            alt={
                                                person.name
                                            }
                                        />
                                    ) : (
                                        <div className="detail-person-card__placeholder">
                                            ?
                                        </div>
                                    )}
                                </div>

                                <div className="detail-person-card__content">
                                    <strong>
                                        {person.name}
                                    </strong>

                                    {subtitle && (
                                        <span>
                                            {subtitle}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.section>
    );
}