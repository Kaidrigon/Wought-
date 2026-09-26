export const sidebarVariants = {

    collapsed: {

        transition: {

            staggerChildren: 0,

            staggerDirection: -1,

        },

    },

    expanded: {

        transition: {

            delayChildren: 0.08,

            staggerChildren: 0.045,

        },

    },

};

export const itemVariants = {

    collapsed: {

        opacity: 0,

        x: -10,

        transition: {

            duration: 0.12,

        },

    },

    expanded: {

        opacity: 1,

        x: 0,

        transition: {

            duration: 0.18,

        },

    },

};