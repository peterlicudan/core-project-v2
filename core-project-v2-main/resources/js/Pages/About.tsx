import { Head } from "@inertiajs/react";
import { motion } from "motion/react";

import Header from "../Components/Header";
import Footer from "../Components/Footer";

export default function About() {
    return (
        <>
            <Head title="About Us" />

            <div
                className="
                    bg-black
                    text-white
                    min-h-screen
                "
            >
                <Header />

                {/* =========================================================
                    HERO SECTION
                ========================================================= */}

                <section
                    className="
                        relative
                        pt-40
                        pb-24
                        overflow-hidden
                    "
                >
                    <div
                        className="
                            absolute
                            inset-0
                            bg-linear-to-br
                            from-yellow-500/10
                            via-transparent
                            to-black
                        "
                    />

                    <div
                        className="
                            relative
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >
                        <div
                            className="
                                grid
                                lg:grid-cols-2
                                gap-16
                                items-center
                            "
                        >
                            {/* TEXT */}

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    x: -50,
                                }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                }}
                                transition={{
                                    duration: 0.7,
                                }}
                            >
                                <span
                                    className="
                                        inline-block
                                        px-5
                                        py-2
                                        rounded-full
                                        bg-yellow-400/10
                                        border
                                        border-yellow-400/20
                                        text-yellow-400
                                        font-semibold
                                    "
                                >
                                    About Our Company
                                </span>

                                <h1
                                    className="
                                        mt-8
                                        text-5xl
                                        md:text-7xl
                                        font-black
                                        leading-tight
                                    "
                                >
                                    Building Smarter
                                    <span className="text-yellow-400">
                                        {" "}
                                        Logistics Operations
                                    </span>
                                </h1>

                                <p
                                    className="
                                        mt-8
                                        text-lg
                                        md:text-xl
                                        text-gray-400
                                        max-w-xl
                                        leading-relaxed
                                    "
                                >
                                    ALIBATON is a digital logistics management
                                    platform designed to streamline fleet
                                    operations, monitor shipments in real time,
                                    manage dispatch schedules, and improve
                                    transportation efficiency through
                                    data-driven insights.
                                </p>
                            </motion.div>

                            {/* IMAGE */}

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    x: 50,
                                }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                }}
                                transition={{
                                    duration: 0.7,
                                }}
                                className="
                                    group
                                "
                            >
                                <div
                                    className="
                                        relative
                                        overflow-hidden
                                        rounded-3xl
                                        border
                                        border-yellow-400/20
                                        shadow-2xl
                                        transition-all
                                        duration-500
                                        hover:border-yellow-400
                                    "
                                >
                                    <img
                                        src="/images/big.jpg"
                                        alt="Crane Truck"
                                        className="
                                            w-full
                                            h-87.5
                                            md:h-125
                                            object-cover
                                            group-hover:scale-105
                                            transition-transform
                                            duration-700
                                        "
                                    />

                                    <div
                                        className="
                                            absolute
                                            inset-0
                                            bg-linear-to-t
                                            from-black
                                            via-transparent
                                            to-transparent
                                        "
                                    />

                                    <div
                                        className="
                                            absolute
                                            bottom-8
                                            left-8
                                        "
                                    >
                                        <h2
                                            className="
                                                text-3xl
                                                font-black
                                            "
                                        >
                                            Reliable. Powerful. Professional.
                                        </h2>

                                        <p
                                            className="
                                                mt-3
                                                text-gray-300
                                            "
                                        >
                                            Modern heavy transportation
                                            solutions.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    INTRODUCTION SECTION
                ========================================================= */}

                <section
                    className="
                        py-24
                        bg-zinc-950
                        relative
                        overflow-hidden
                    "
                >
                    <div
                        className="
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >
                        <div
                            className="
                                grid
                                lg:grid-cols-2
                                gap-16
                                items-center
                            "
                        >
                            {/* IMAGE */}

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    x: -50,
                                }}
                                whileInView={{
                                    opacity: 1,
                                    x: 0,
                                }}
                                viewport={{
                                    once: true,
                                }}
                                transition={{
                                    duration: 0.7,
                                }}
                                className="
                                    group
                                    relative
                                "
                            >
                                <div
                                    className="
                                        absolute
                                        -bottom-4
                                        -left-4
                                        w-full
                                        h-full
                                        border-2
                                        border-yellow-400
                                        rounded-3xl
                                    "
                                />

                                <div
                                    className="
                                        relative
                                        overflow-hidden
                                        rounded-3xl
                                        border
                                        border-yellow-400/20
                                        shadow-2xl
                                        transition-all
                                        duration-500
                                        hover:border-yellow-400
                                    "
                                >
                                    <img
                                        src="/images/big16.jpg"
                                        alt="Alibaton Construction"
                                        className="
                                            w-full
                                            h-87.5
                                            md:h-125
                                            object-cover
                                            group-hover:scale-105
                                            transition-transform
                                            duration-700
                                        "
                                    />
                                </div>
                            </motion.div>

                            {/* TEXT */}

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    x: 50,
                                }}
                                whileInView={{
                                    opacity: 1,
                                    x: 0,
                                }}
                                viewport={{
                                    once: true,
                                }}
                                transition={{
                                    duration: 0.7,
                                }}
                            >
                                <span
                                    className="
                                        inline-block
                                        text-sm
                                        font-bold
                                        text-yellow-400
                                        tracking-wider
                                    "
                                >
                                    — INTRODUCTION
                                </span>

                                <h2
                                    className="
                                        mt-5
                                        text-4xl
                                        md:text-5xl
                                        font-black
                                        leading-tight
                                    "
                                >
                                    Building trust through reliability,
                                    innovation and technical expertise.
                                </h2>

                                <p
                                    className="
                                        mt-8
                                        text-base
                                        md:text-lg
                                        text-gray-400
                                        leading-relaxed
                                    "
                                >
                                    Established in 2017, Alibaton Construction
                                    Inc. is a dynamic and growing construction
                                    services company based in Quezon City, NCR,
                                    Philippines.
                                </p>

                                <p
                                    className="
                                        mt-6
                                        text-base
                                        md:text-lg
                                        text-gray-400
                                        leading-relaxed
                                    "
                                >
                                    We are recognized for construction
                                    equipment rental specializing in tower
                                    cranes, construction hoists, mobile cranes
                                    and heavy equipment. Our expansion into
                                    construction fit-out and advanced
                                    waterproofing allows us to provide more
                                    complete, end-to-end solutions.
                                </p>

                                <div
                                    className="
                                        mt-8
                                        border-l-4
                                        border-yellow-400
                                        pl-5
                                    "
                                >
                                    <p
                                        className="
                                            text-lg
                                            md:text-xl
                                            font-bold
                                            text-white
                                            italic
                                        "
                                    >
                                        "Committed to your success, from the
                                        ground up."
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    MISSION & VISION
                ========================================================= */}

                <section
                    className="
                        py-24
                        bg-black
                    "
                >
                    <div
                        className="
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >
                        {/* SECTION LABEL */}

                        <div className="mb-12">
                            <span
                                className="
                                    inline-block
                                    text-sm
                                    font-bold
                                    text-yellow-400
                                    tracking-wider
                                "
                            >
                                — MISSION & VISION
                            </span>
                        </div>

                        <div
                            className="
                                grid
                                md:grid-cols-2
                                gap-8
                            "
                        >
                            <InfoCard
                                title="Our Mission"
                                description="
                                    To support the construction industry by providing safe, efficient and high-quality equipment and services - empowering clients to build with confidence.
                                "
                            />

                            <InfoCard
                                title="Our Vision"
                                description="
                                    To be a leading one-stop solutions provider in the construction industry, known for reliability, innovation and excellence.
                                "
                            />
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
}

function InfoCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 30,
            }}
            whileInView={{
                opacity: 1,
                y: 0,
            }}
            viewport={{
                once: true,
            }}
            whileHover={{
                y: -8,
            }}
            transition={{
                duration: 0.5,
            }}
            className="
                bg-black
                border
                border-yellow-400/20
                rounded-3xl
                p-10
                hover:border-yellow-400
                transition-all
                duration-500
            "
        >
            <h2
                className="
                    text-3xl
                    font-black
                    text-yellow-400
                "
            >
                {title}
            </h2>

            <p
                className="
                    mt-5
                    text-gray-400
                    leading-relaxed
                "
            >
                {description}
            </p>
        </motion.div>
    );
}

function FeatureCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 30,
            }}
            whileInView={{
                opacity: 1,
                y: 0,
            }}
            viewport={{
                once: true,
            }}
            whileHover={{
                y: -8,
            }}
            transition={{
                duration: 0.5,
            }}
            className="
                bg-black
                border
                border-yellow-400/20
                rounded-3xl
                p-8
                hover:border-yellow-400
                hover:shadow-xl
                hover:shadow-yellow-400/10
                transition-all
                duration-500
            "
        >
            <div
                className="
                    w-14
                    h-14
                    rounded-2xl
                    bg-yellow-400
                    text-black
                    font-black
                    flex
                    items-center
                    justify-center
                    text-xl
                "
            >
                ✓
            </div>

            <h3
                className="
                    mt-6
                    text-xl
                    font-bold
                "
            >
                {title}
            </h3>

            <p
                className="
                    mt-3
                    text-gray-400
                    leading-relaxed
                "
            >
                {description}
            </p>
        </motion.div>
    );
}
