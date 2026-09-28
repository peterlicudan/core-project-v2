import { Head, Link } from "@inertiajs/react";
import { motion } from "motion/react";

import Header from "../Components/Header";
import Footer from "../Components/Footer";

export default function Services() {
    return (
        <>
            <Head title="Services" />

            <div className="bg-black text-white min-h-screen">
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
                            bg-gradient-to-br
                            from-yellow-500/10
                            via-transparent
                            to-black
                        "
                    />

                    <div className="relative max-w-7xl mx-auto px-6">
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 40,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            transition={{
                                duration: 0.8,
                            }}
                            className="text-center"
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
                                Your lifting equipment expert
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
                                From heavy lifting
                                <span className="text-yellow-400">
                                    {" "}
                                    to final touches.
                                </span>
                            </h1>

                            <p
                                className="
                                    mt-6
                                    text-lg
                                    md:text-xl
                                    text-gray-400
                                    max-w-3xl
                                    mx-auto
                                    leading-relaxed
                                "
                            >
                                Quezon City, Philippines — Complete project
                                support for construction and lifting
                                operations.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* =========================================================
                    SECTION 1 — CONSULTATION SERVICE
                ========================================================= */}

                <section className="pb-24">
                    <div className="max-w-7xl mx-auto px-6">
                        {/* HEADER */}

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
                            transition={{
                                duration: 0.6,
                            }}
                            className="text-center mb-16"
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
                                — CONSULTATION SERVICE
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
                                Comprehensive tower crane
                                <span className="text-yellow-400">
                                    {" "}
                                    solutions at every step.
                                </span>
                            </h2>

                            <p
                                className="
                                    mt-6
                                    text-gray-400
                                    max-w-3xl
                                    mx-auto
                                    leading-relaxed
                                "
                            >
                                We combine experience, technology and a
                                commitment to excellence to deliver safe,
                                timely and quality project support from concept
                                to completion.
                            </p>
                        </motion.div>

                        {/* CARDS */}

                        <div
                            className="
                                grid
                                md:grid-cols-2
                                lg:grid-cols-3
                                gap-6
                            "
                        >
                            <ServiceCard
                                title="Operators & Riggers"
                                description="Qualified manpower for safe crane operation, signaling, load handling and rigging activities."
                            />

                            <ServiceCard
                                title="Erection & Dismantling"
                                description="Planned installation and removal supported by experienced personnel and lifting coordination."
                            />

                            <ServiceCard
                                title="Telescoping & Climbing"
                                description="Controlled tower extension activities aligned with the structure and construction schedule."
                            />

                            <ServiceCard
                                title="Maintenance & Repair"
                                description="Preventive maintenance, inspection, troubleshooting and repair to support uptime and reliability."
                            />

                            <ServiceCard
                                title="Logistics"
                                description="Equipment yard handling, transport coordination and mobilization of tower crane components."
                            />

                            <ServiceCard
                                title="Technical Consultation"
                                description="Review of project requirements, site constraints, crane capacity, radius, height and service scope."
                            />
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    SECTION 2 — DESIGN & BUILD
                ========================================================= */}

                <section className="pb-24 bg-zinc-950 py-24">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* TEXT */}

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
                                    — DESIGN & BUILD
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
                                    Fit-out construction from
                                    <span className="text-yellow-400">
                                        {" "}
                                        concept to completion.
                                    </span>
                                </h2>

                                <p
                                    className="
                                        mt-6
                                        text-gray-400
                                        leading-relaxed
                                    "
                                >
                                    Alibaton has expanded into design and build
                                    and construction fit-out services, bringing
                                    the same professionalism and quality to
                                    interior construction, renovation and
                                    finishing works.
                                </p>

                                <div className="mt-8 space-y-4">
                                    <CheckItem
                                        title="Drywall import, supply & installation"
                                        description="Material supply and coordinated installation for high-rise fit-out works."
                                    />

                                    <CheckItem
                                        title="Ceiling works & drywall fit-out"
                                        description="Interior partition and ceiling systems aligned with project design and sequencing."
                                    />

                                    <CheckItem
                                        title="Tiling works & bathroom fixtures"
                                        description="Installation and finishing for premium residential and hospitality interiors."
                                    />
                                </div>
                            </motion.div>

                            {/* IMAGE */}

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
                                className="group relative"
                            >
                                <div
                                    className="
                                        absolute
                                        -bottom-4
                                        -right-4
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
                                    "
                                >
                                    <img
                                        src="/images/big.jpg"
                                        alt="Design & Build"
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
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    SECTION 3 — WATERPROOFING
                ========================================================= */}

                <section className="py-24">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
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
                                className="group relative order-2 lg:order-1"
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
                                    "
                                >
                                    <img
                                        src="/images/big.jpg"
                                        alt="Waterproofing"
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
                                className="order-1 lg:order-2"
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
                                    — WATERPROOFING
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
                                    Protection systems for
                                    <span className="text-yellow-400">
                                        {" "}
                                        critical building areas.
                                    </span>
                                </h2>

                                <p
                                    className="
                                        mt-6
                                        text-gray-400
                                        leading-relaxed
                                    "
                                >
                                    Our construction services include
                                    waterproofing solutions for residential and
                                    below-grade structures, including bentonite
                                    waterproofing applications.
                                </p>

                                <p
                                    className="
                                        mt-4
                                        text-gray-400
                                        leading-relaxed
                                    "
                                >
                                    Scope, materials and installation methods
                                    are defined based on project conditions and
                                    approved technical requirements.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    CTA
                ========================================================= */}

                <section className="pb-24">
                    <div className="max-w-5xl mx-auto px-6">
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
                            className="
                                rounded-3xl
                                border
                                border-yellow-400/20
                                bg-zinc-950
                                p-10
                                md:p-16
                                text-center
                            "
                        >
                            <h2
                                className="
                                    text-4xl
                                    md:text-5xl
                                    font-black
                                "
                            >
                                Ready To Start Your
                                <span className="text-yellow-400">
                                    {" "}
                                    Next Project?
                                </span>
                            </h2>

                            <p
                                className="
                                    mt-6
                                    text-gray-400
                                    max-w-2xl
                                    mx-auto
                                    leading-relaxed
                                "
                            >
                                From heavy lifting to final touches, we
                                deliver complete project support with safety,
                                quality and reliability.
                            </p>

                            <div className="mt-8">
                                <Link
                                    href="/contact"
                                    className="
                                        inline-flex
                                        items-center
                                        px-8
                                        py-4
                                        rounded-2xl
                                        bg-yellow-400
                                        text-black
                                        font-bold
                                        hover:scale-105
                                        transition-all
                                        duration-300
                                    "
                                >
                                    Contact Us
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
}

function ServiceCard({
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
                duration: 0.4,
            }}
            className="
                group
                bg-zinc-900
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
                    w-12
                    h-12
                    rounded-2xl
                    bg-yellow-400
                    flex
                    items-center
                    justify-center
                    text-black
                    font-black
                    text-lg
                    transition-transform
                    duration-500
                    group-hover:scale-110
                "
            >
                ✓
            </div>

            <h3
                className="
                    mt-6
                    text-2xl
                    font-bold
                    text-white
                "
            >
                {title}
            </h3>

            <p
                className="
                    mt-4
                    text-gray-400
                    leading-relaxed
                "
            >
                {description}
            </p>
        </motion.div>
    );
}

function CheckItem({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4">
            <div
                className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-yellow-400
                    text-black
                    font-black
                    text-sm
                "
            >
                ✓
            </div>

            <div>
                <p className="font-bold text-white">{title}</p>

                <p className="mt-1 text-sm text-gray-400 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}
