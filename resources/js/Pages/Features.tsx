import { Head } from "@inertiajs/react";
import { motion } from "motion/react";

import Header from "../Components/Header";
import Footer from "../Components/Footer";

import {
    Truck,
    Users,
    ClipboardList,
    FileText,
    BarChart3,
    ShieldCheck,
    Settings,
    Gauge,
    HardHat,
} from "lucide-react";


export default function Features() {

    return (
        <>
            <Head title="Features" />

            <div className="
                bg-black
                text-white
                min-h-screen
                overflow-hidden
            ">

                <Header />



                {/* HERO SECTION */}


                <section
                    className="
                        relative
                        min-h-screen
                        flex
                        items-center
                        overflow-hidden
                    "
                >


                    <div
                        className="
                            absolute
                            top-0
                            left-0
                            w-96
                            h-96
                            bg-yellow-400/10
                            blur-3xl
                            rounded-full
                        "
                    />


                    <div
                        className="
                            absolute
                            bottom-0
                            right-0
                            w-96
                            h-96
                            bg-yellow-400/10
                            blur-3xl
                            rounded-full
                        "
                    />



                    <div
                        className="
                            relative
                            z-10
                            max-w-7xl
                            mx-auto
                            px-6
                            w-full
                        "
                    >


                        <motion.div

                            initial={{
                                opacity:0,
                                y:50
                            }}

                            animate={{
                                opacity:1,
                                y:0
                            }}

                            transition={{
                                duration:.8
                            }}

                            className="
                                text-center
                            "
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
                                    tracking-widest
                                "
                            >
                                ALIBATON FEATURES
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

                                Advanced Solutions
                                <br />

                                <span className="text-yellow-400">
                                    For Heavy Operations
                                </span>

                            </h1>




                            <p
                                className="
                                    mt-6
                                    text-gray-400
                                    text-lg
                                    max-w-3xl
                                    mx-auto
                                    leading-relaxed
                                "
                            >

                                ALIBATON delivers smart management
                                solutions designed for crane operations,
                                trucking services, transportation,
                                and construction logistics.

                            </p>



                        </motion.div>


                    </div>


                </section>





                {/* SYSTEM BENEFITS */}


                <section className="py-32">


                    <div
                        className="
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >



                        <motion.div

                            initial={{
                                opacity:0,
                                y:40
                            }}

                            whileInView={{
                                opacity:1,
                                y:0
                            }}

                            viewport={{
                                once:true
                            }}

                            className="
                                rounded-[40px]
                                overflow-hidden
                                border
                                border-yellow-400/20
                                bg-zinc-950
                            "
                        >



                            <div
                                className="
                                    grid
                                    lg:grid-cols-2
                                "
                            >



                                <div
                                    className="
                                        p-10
                                        md:p-16
                                    "
                                >


                                    <span
                                        className="
                                            text-yellow-400
                                            font-semibold
                                            tracking-widest
                                        "
                                    >
                                        SYSTEM BENEFITS
                                    </span>



                                    <h2
                                        className="
                                            mt-5
                                            text-4xl
                                            md:text-6xl
                                            font-black
                                        "
                                    >

                                        Everything
                                        <span className="text-yellow-400">
                                            {" "}Connected
                                        </span>

                                    </h2>




                                    <p
                                        className="
                                            mt-6
                                            text-gray-400
                                            text-lg
                                            leading-relaxed
                                        "
                                    >

                                        ALIBATON provides a centralized
                                        system that helps manage equipment,
                                        personnel, records, reports, and
                                        daily logistics activities.

                                    </p>




                                    <div
                                        className="
                                            mt-8
                                            space-y-4
                                            text-gray-300
                                            text-lg
                                        "
                                    >

                                        <p>
                                            ✓ Organized operational records
                                        </p>


                                        <p>
                                            ✓ Better team coordination
                                        </p>


                                        <p>
                                            ✓ Improved project monitoring
                                        </p>


                                        <p>
                                            ✓ Reliable data management
                                        </p>


                                    </div>



                                </div>





                                <img

                                    src="/images/big16.jpg"

                                    className="
                                        w-full
                                        h-full
                                        min-h-[500px]
                                        object-cover
                                    "

                                />



                            </div>



                        </motion.div>



                    </div>


                </section>

                                {/* OPERATIONAL FEATURES */}


                <section className="py-32">


                    <div
                        className="
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >



                        <motion.div

                            initial={{
                                opacity:0,
                                y:40
                            }}

                            whileInView={{
                                opacity:1,
                                y:0
                            }}

                            viewport={{
                                once:true
                            }}

                            className="
                                text-center
                                mb-16
                            "
                        >



                            <span
                                className="
                                    text-yellow-400
                                    font-semibold
                                    tracking-widest
                                "
                            >
                                OPERATIONAL FEATURES
                            </span>




                            <h2
                                className="
                                    mt-5
                                    text-4xl
                                    md:text-6xl
                                    font-black
                                "
                            >

                                Built For

                                <span className="text-yellow-400">
                                    {" "}Heavy Operations
                                </span>

                            </h2>




                            <p
                                className="
                                    mt-6
                                    text-gray-400
                                    max-w-3xl
                                    mx-auto
                                    text-lg
                                "
                            >

                                Powerful features designed to support
                                crane operations, trucking services,
                                equipment management, and construction
                                logistics.

                            </p>



                        </motion.div>





                        <div
                            className="
                                grid
                                md:grid-cols-2
                                lg:grid-cols-3
                                gap-8
                            "
                        >



                            <FeatureCard

                                icon={<Truck size={30}/>}

                                title="Heavy Equipment Management"

                                description="
                                Manage cranes, trucks, and construction
                                equipment efficiently for daily operations.
                                "

                            />




                            <FeatureCard

                                icon={<Users size={30}/>}

                                title="Project Coordination"

                                description="
                                Improve communication between operators,
                                drivers, and project teams.
                                "

                            />




                            <FeatureCard

                                icon={<ClipboardList size={30}/>}

                                title="Transportation Planning"

                                description="
                                Organize hauling schedules, delivery
                                routes, and equipment movement.
                                "

                            />





                            <FeatureCard

                                icon={<ShieldCheck size={30}/>}

                                title="Safety Compliance"

                                description="
                                Maintain safe operations through proper
                                procedures and monitoring.
                                "

                            />





                            <FeatureCard

                                icon={<Settings size={30}/>}

                                title="Maintenance Tracking"

                                description="
                                Monitor equipment condition and
                                maintenance schedules.
                                "

                            />





                            <FeatureCard

                                icon={<BarChart3 size={30}/>}

                                title="Performance Reporting"

                                description="
                                Generate reports to improve operational
                                decisions and project performance.
                                "

                            />



                        </div>



                    </div>



                </section>





                {/* WHY ALIBATON */}


                <section className="py-32">


                    <div
                        className="
                            max-w-7xl
                            mx-auto
                            px-6
                        "
                    >



                        <motion.div

                            initial={{
                                opacity:0,
                                y:40
                            }}

                            whileInView={{
                                opacity:1,
                                y:0
                            }}

                            viewport={{
                                once:true
                            }}

                            className="
                                grid
                                lg:grid-cols-2
                                gap-16
                                items-center
                            "
                        >




                            <img

                                src="/images/fourpics/crane1.jpg"

                                className="
                                    rounded-[40px]
                                    h-[500px]
                                    w-full
                                    object-cover
                                    border
                                    border-yellow-400/20
                                "

                            />





                            <div>



                                <span
                                    className="
                                        text-yellow-400
                                        font-semibold
                                        tracking-widest
                                    "
                                >

                                    WHY ALIBATON

                                </span>





                                <h2
                                    className="
                                        mt-5
                                        text-4xl
                                        md:text-6xl
                                        font-black
                                    "
                                >

                                    Reliable System

                                    <span className="text-yellow-400">
                                        {" "}For Industry
                                    </span>


                                </h2>





                                <p
                                    className="
                                        mt-6
                                        text-gray-400
                                        text-lg
                                        leading-relaxed
                                    "
                                >

                                    ALIBATON combines technology,
                                    equipment management, and organized
                                    operations to provide dependable
                                    solutions for construction and
                                    logistics projects.

                                </p>




                                <div
                                    className="
                                        mt-8
                                        space-y-5
                                    "
                                >



                                    <CheckItem text="Efficient project management"/>

                                    <CheckItem text="Reliable equipment monitoring"/>

                                    <CheckItem text="Improved operational workflow"/>

                                    <CheckItem text="Safety-focused solutions"/>



                                </div>




                            </div>




                        </motion.div>



                    </div>



                </section>





                <Footer />

            </div>

        </>
    );
}






function FeatureCard({

    icon,

    title,

    description,


}:{

    icon:React.ReactNode;

    title:string;

    description:string;


}){


    return (

        <motion.div

            initial={{
                opacity:0,
                y:30
            }}

            whileInView={{
                opacity:1,
                y:0
            }}

            viewport={{
                once:true
            }}

            whileHover={{
                y:-10
            }}

            className="
                bg-zinc-900
                border
                border-yellow-400/20
                rounded-3xl
                p-8
                transition
                hover:border-yellow-400
            "

        >



            <div
                className="
                    w-14
                    h-14
                    rounded-2xl
                    bg-yellow-400
                    text-black
                    flex
                    items-center
                    justify-center
                "
            >

                {icon}

            </div>




            <h3
                className="
                    mt-6
                    text-2xl
                    font-bold
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

    text

}:{

    text:string;

}){


    return (

        <div
            className="
                flex
                items-center
                gap-4
            "
        >

            <div
                className="
                    h-3
                    w-3
                    rounded-full
                    bg-yellow-400
                "
            />


            <span className="text-gray-300 text-lg">

                {text}

            </span>


        </div>

    );


}