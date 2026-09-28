import {
    Truck,
    Building2,
    TowerControl,
    ShieldCheck,
    Clock,
} from "lucide-react";

import { Head, Link } from "@inertiajs/react";
import { motion } from "motion/react";

import Header from "../Components/Header";
import Footer from "../Components/Footer";

export default function Home() {
    return (
        <>
            <Head title="Crane Trucking System" />

            <div
                className="
bg-black
text-white
min-h-screen
overflow-hidden
"
            >
                <Header />

                {/* HERO SECTION */}

                <section
                    className="
relative
min-h-[650px]
md:h-[700px]
overflow-hidden
"
                >
                    <img
                        src="/images/big2.jpg"
                        alt="Crane Truck"
                        className="
absolute
inset-0
w-full
h-full
object-cover
"
                    />

                    <div
                        className="
absolute
inset-0
bg-black/70
"
                    />

                    <div
                        className="
relative
max-w-7xl
mx-auto
px-5
sm:px-8
h-full
flex
items-center
"
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: -80,
                            }}
                            animate={{
                                opacity: 1,
                                x: 0,
                            }}
                            transition={{
                                duration: 0.9,
                            }}
                            className="
max-w-3xl
pt-20
"
                        >
                            <span
                                className="
inline-block
bg-yellow-400
text-black
px-5
py-2
rounded-full
font-bold
text-sm
sm:text-base
"
                            >
                                Professional Crane Services
                            </span>

                            <h1
                                className="
mt-8
text-4xl
sm:text-5xl
md:text-7xl
font-black
leading-tight
"
                            >
                                Crane Service
                                <br />
                                <span
                                    className="
text-yellow-400
"
                                >
                                    At The Next Level
                                </span>
                            </h1>

                            <p
                                className="
mt-6
text-gray-300
text-base
sm:text-lg
md:text-xl
max-w-xl
leading-relaxed
"
                            >
                                Reliable crane operation, heavy hauling, and
                                smart logistics solutions for modern
                                construction businesses.
                            </p>

                            <div
                                className="
flex
flex-col
sm:flex-row
gap-4
mt-10
"
                            >
                                <Link
                                    href="/services"
                                    className="
bg-yellow-400
text-black
px-8
py-4
rounded-xl
font-bold
text-center
hover:scale-105
hover:shadow-xl
transition-all
duration-300
"
                                >
                                    Our Services
                                </Link>

                                <Link
                                    href="/contact"
                                    className="
border
border-yellow-400
text-yellow-400
px-8
py-4
rounded-xl
font-bold
text-center
hover:bg-yellow-400
hover:text-black
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

                {/* ABOUT SECTION */}

                <section
                    className="
py-20
md:py-28
bg-white
text-black
"
                >
                    <div
                        className="
max-w-7xl
mx-auto
px-5
sm:px-8
grid
lg:grid-cols-2
gap-12
items-center
"
                    >
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
                                amount: 0.2,
                            }}
                            transition={{
                                duration: 0.8,
                            }}
                        >
                            <span
                                className="
text-yellow-500
font-bold
uppercase
tracking-widest
text-sm
"
                            >
                                About Our Company
                            </span>

                            <h2
                                className="
mt-4
text-4xl
sm:text-5xl
font-black
leading-tight
"
                            >
                                Who We
                                <span
                                    className="
text-yellow-400
"
                                >
                                    {" "}
                                    Are?
                                </span>
                            </h2>

                            <p
                                className="
mt-6
text-gray-600
text-base
sm:text-lg
leading-relaxed
"
                            >
                                Crane Trucking provides professional crane
                                services, heavy lifting solutions,
                                transportation, and fleet management for
                                construction and industrial projects.
                            </p>

                            <p
                                className="
mt-5
text-gray-600
text-base
sm:text-lg
leading-relaxed
"
                            >
                                With skilled operators and reliable equipment,
                                we deliver safe, efficient, and dependable
                                solutions for every project.
                            </p>

                            <Link
                                href="/about"
                                className="
inline-block
mt-8
bg-black
text-yellow-400
px-8
py-4
rounded-xl
font-bold
hover:bg-yellow-400
hover:text-black
hover:-translate-y-1
transition-all
duration-300
"
                            >
                                Learn More
                            </Link>
                        </motion.div>

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
                                duration: 0.8,
                            }}
                            className="
relative
group
"
                        >
                            <div
                                className="
absolute
-inset-3
bg-yellow-400/30
blur-3xl
rounded-3xl
opacity-0
group-hover:opacity-100
transition
duration-500
"
                            />

                            <div
                                className="
overflow-hidden
rounded-3xl
shadow-2xl
relative
"
                            >
                                <img
                                    src="/images/big16.jpg"
                                    alt="Crane Trucking"
                                    className="
w-full
h-[350px]
sm:h-[450px]
object-cover
rounded-3xl
group-hover:scale-110
transition-transform
duration-700
"
                                />

                                <div
                                    className="
absolute
inset-0
bg-gradient-to-t
from-black/80
via-transparent
"
                                />

                                <div
                                    className="
absolute
bottom-8
left-6
right-6
text-white
"
                                >
                                    <h3
                                        className="
text-2xl
sm:text-3xl
font-black
"
                                    >
                                        Heavy Equipment.
                                        <br />
                                        Professional Service.
                                    </h3>

                                    <p
                                        className="
mt-3
text-gray-300
"
                                    >
                                        Reliable crane solutions for every
                                        project.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* PROJECT GALLERY LOOP */}

                <section
                    className="
py-24
bg-black
overflow-hidden
"
                >
                    <div
                        className="
max-w-7xl
mx-auto
px-5
sm:px-8
"
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 40,
                            }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                            }}
                            viewport={{
                                once: true,
                            }}
                            className="text-center"
                        >
                            <span
                                className="
text-yellow-400
font-bold
uppercase
tracking-widest
"
                            >
                                Our Projects
                            </span>

                            <h2
                                className="
mt-4
text-4xl
sm:text-5xl
font-black
"
                            >
                                Real Projects. Real Results.
                                <span className="text-yellow-400">
                                    {" "}
                                    Gallery
                                </span>
                            </h2>

                            <p
                                className="
mt-5
text-gray-400
max-w-2xl
mx-auto
"
                            >
                                See our crane operations, heavy lifting, and
                                transportation services in action.
                            </p>
                        </motion.div>
                    </div>

                    {/* MOVING IMAGES */}

                    <div
                        className="
mt-16
relative
"
                    >
                        <div
                            className="
flex
gap-8
w-max
gallery-scroll
"
                        >
                            {[
                                "/images/project1.jpg",
                                "/images/project2.jpg",
                                "/images/project3.jpg",
                                "/images/project4.jpg",
                                "/images/project5.jpg",

                                // duplicate para continuous loop
                                "/images/project1.jpg",
                                "/images/project2.jpg",
                                "/images/project3.jpg",
                                "/images/project4.jpg",
                                "/images/project5.jpg",
                            ].map((image, index) => (
                                <div
                                    key={index}
                                    className="
w-[320px]
h-[250px]
sm:w-[420px]
sm:h-[300px]
rounded-3xl
overflow-hidden
border
border-yellow-400/20
group
"
                                >
                                    <img
                                        src={image}
                                        alt="Crane Project"
                                        className="
w-full
h-full
object-cover
group-hover:scale-110
transition-transform
duration-700
"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                {/* FEATURES SECTION */}

                <section
                    className="
py-24
bg-zinc-950
overflow-hidden
"
                >
                    <div
                        className="
max-w-7xl
mx-auto
px-5
sm:px-8
"
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 40,
                            }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                            }}
                            viewport={{
                                once: true,
                            }}
                            className="text-center"
                        >
                            <span
                                className="
text-yellow-400
font-bold
uppercase
tracking-widest
"
                            >
                                Why Choose Us
                            </span>

                            <h2
                                className="
mt-4
text-4xl
sm:text-5xl
font-black
"
                            >
                                Built For Heavy
                                <span className="text-yellow-400">
                                    {" "}
                                    Operations
                                </span>
                            </h2>

                            <p
                                className="
mt-5
text-gray-400
max-w-2xl
mx-auto
"
                            >
                                Reliable equipment, skilled operators, and
                                professional solutions designed for construction
                                and industrial projects.
                            </p>
                        </motion.div>

                        <div
                            className="
mt-16
grid
md:grid-cols-2
lg:grid-cols-4
gap-8
"
                        >
                            <FeatureCard
                                icon={<TowerControl size={38} />}
                                title="Advanced Equipment"
                                desc="Modern crane units and heavy machinery prepared for demanding projects."
                                image="/images/fourpics/crane1.jpg"
                            />

                            <FeatureCard
                                icon={<ShieldCheck size={38} />}
                                title="Safety First"
                                desc="Certified operators and strict safety procedures on every operation."
                                image="/images/fourpics/crane2.jpg"
                            />

                            <FeatureCard
                                icon={<Truck size={38} />}
                                title="Reliable Logistics"
                                desc="Efficient hauling and transportation solutions for every location."
                                image="/images/fourpics/crane3.jpg"
                            />

                            <FeatureCard
                                icon={<Clock size={38} />}
                                title="24/7 Support"
                                desc="Fast response assistance whenever your project needs support."
                                image="/images/fourpics/crane4.jpg"
                            />
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
}

// ===============================
// SERVICE CARD COMPONENT
// ===============================

function ServiceCard({
    icon,
    title,
    desc,
    features,
}: {
    icon: React.ReactNode;

    title: string;

    desc: string;

    features: string[];
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 50,
            }}
            whileInView={{
                opacity: 1,
                y: 0,
            }}
            viewport={{
                once: true,
                amount: 0.2,
            }}
            whileHover={{
                y: -12,
                scale: 1.02,
            }}
            transition={{
                duration: 0.4,
            }}
            className="
group
relative
overflow-hidden
bg-black
border
border-yellow-400/20
rounded-3xl
p-8
hover:border-yellow-400
transition-all
duration-500
"
        >
            {/* Glow Background */}

            <div
                className="
absolute
inset-0
bg-yellow-400/10
blur-3xl
opacity-0
group-hover:opacity-100
transition
duration-500
"
            />

            <div
                className="
relative
"
            >
                {/* ICON */}

                <div
                    className="
w-20
h-20
rounded-2xl
bg-yellow-400
text-black
flex
items-center
justify-center
mb-8
group-hover:rotate-6
group-hover:scale-110
transition-all
duration-300
"
                >
                    {icon}
                </div>

                <h3
                    className="
text-2xl
sm:text-3xl
font-black
"
                >
                    {title}
                </h3>

                <p
                    className="
mt-5
text-gray-400
leading-relaxed
"
                >
                    {desc}
                </p>

                <ul
                    className="
mt-8
space-y-4
"
                >
                    {features.map((feature, index) => (
                        <li
                            key={index}
                            className="
flex
items-center
gap-3
text-gray-300
"
                        >
                            <span
                                className="
w-2
h-2
rounded-full
bg-yellow-400
"
                            ></span>

                            {feature}
                        </li>
                    ))}
                </ul>

                <button
                    className="
mt-8
w-full
py-3
rounded-xl
border
border-yellow-400
text-yellow-400
font-bold
hover:bg-yellow-400
hover:text-black
transition-all
duration-300
"
                >
                    Learn More
                </button>
            </div>
        </motion.div>
    );
}

// ===============================
// STAT COMPONENT
// ===============================

// ===============================
// FEATURE CARD COMPONENT
// ===============================

function FeatureCard({
    icon,
    title,
    desc,
    image,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    image: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 50,
            }}
            whileInView={{
                opacity: 1,
                y: 0,
            }}
            viewport={{
                once: true,
            }}
            whileHover={{
                y: -10,
            }}
            transition={{
                duration: 0.5,
            }}
            className="
group
relative
overflow-hidden
rounded-3xl
h-[420px]
border
border-yellow-400/20
"
        >
            <img
                src={image}
                alt={title}
                className="
absolute
inset-0
w-full
h-full
object-cover
group-hover:scale-110
transition-transform
duration-700
"
            />

            <div
                className="
absolute
inset-0
bg-black/70
"
            />

            <div
                className="
relative
z-10
p-8
h-full
flex
flex-col
justify-end
"
            >
                <div
                    className="
w-16
h-16
rounded-2xl
bg-yellow-400
text-black
flex
items-center
justify-center
mb-5
"
                >
                    {icon}
                </div>

                <h3
                    className="
text-2xl
font-black
"
                >
                    {title}
                </h3>

                <p
                    className="
mt-3
text-gray-300
leading-relaxed
"
                >
                    {desc}
                </p>
            </div>
        </motion.div>
    );
}
