import { Head } from "@inertiajs/react";
import { motion } from "motion/react";

import Header from "../Components/Header";
import Footer from "../Components/Footer";

import {
    Phone,
    Mail,
    MapPin,
    Clock,
} from "lucide-react";


export default function Contact() {

    return (
        <>
            <Head title="Contact" />


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
                        min-h-screen
                        flex
                        items-center
                    "
                >

                    <img
                        src="/images/fourpics/crane3.jpg"
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
                            bg-black/80
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
                                max-w-4xl
                            "

                        >



                            <span
                                className="
                                    text-yellow-400
                                    font-semibold
                                    tracking-widest
                                "
                            >

                                CONTACT ALIBATON

                            </span>





                            <h1
                                className="
                                    mt-6
                                    text-5xl
                                    md:text-7xl
                                    font-black
                                    leading-tight
                                "
                            >

                                Connecting Projects

                                <br />

                                <span
                                    className="
                                        text-yellow-400
                                    "
                                >
                                    Through Reliable Logistics
                                </span>

                            </h1>





                            <p
                                className="
                                    mt-6
                                    text-gray-300
                                    text-lg
                                    max-w-2xl
                                    leading-relaxed
                                "
                            >

                                ALIBATON provides professional
                                trucking services, crane operations,
                                heavy equipment transportation,
                                and reliable logistics solutions
                                for construction projects.

                            </p>





                            <div
                                className="
                                    mt-10
                                    flex
                                    flex-wrap
                                    gap-4
                                "
                            >


                                <button
                                    className="
                                        px-8
                                        py-4
                                        rounded-xl
                                        bg-yellow-400
                                        text-black
                                        font-bold
                                        hover:bg-yellow-300
                                        transition
                                    "
                                >

                                    Contact Team

                                </button>




                                <button
                                    className="
                                        px-8
                                        py-4
                                        rounded-xl
                                        border
                                        border-white/30
                                        hover:bg-white/10
                                        transition
                                    "
                                >

                                    View Services

                                </button>


                            </div>



                        </motion.div>


                    </div>


                </section>






                {/* CONTACT INFORMATION */}



                <section
                    className="
                        py-32
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




                            {/* LEFT SIDE */}



                            <motion.div

                                initial={{
                                    opacity:0,
                                    x:-40
                                }}

                                whileInView={{
                                    opacity:1,
                                    x:0
                                }}

                                viewport={{
                                    once:true
                                }}

                            >



                                <span
                                    className="
                                        text-yellow-400
                                        font-semibold
                                        tracking-widest
                                    "
                                >

                                    GET IN TOUCH

                                </span>





                                <h2
                                    className="
                                        mt-5
                                        text-4xl
                                        md:text-6xl
                                        font-black
                                        leading-tight
                                    "
                                >

                                    Let's Build

                                    <br />

                                    <span
                                        className="
                                            text-yellow-400
                                        "
                                    >
                                        Your Next Project
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

                                    Our ALIBATON operations team
                                    is ready to assist with crane
                                    operations, trucking services,
                                    equipment transportation,
                                    and logistics coordination.

                                </p>





                                <div
                                    className="
                                        mt-10
                                        space-y-7
                                    "
                                >



                                    <ContactLine

                                        icon={<Phone />}

                                        title="Telephone"

                                        value="(02) 8253 6817"

                                    />



                                    <ContactLine

                                        icon={<Mail />}

                                        title="Email"

                                        value="info@alibaton.com"

                                    />



                                    <ContactLine

                                        icon={<MapPin />}

                                        title="Main Office"

                                        value="137 Panay Ave, Quezon City, Metro Manila"

                                    />



                                    <ContactLine

                                        icon={<Clock />}

                                        title="Operating Hours"

                                        value="Monday - Saturday | Open until 6:00 PM"

                                    />



                                </div>




                            </motion.div>





                            {/* IMAGE SIDE */}



                            <motion.div

                                initial={{
                                    opacity:0,
                                    scale:.9
                                }}

                                whileInView={{
                                    opacity:1,
                                    scale:1
                                }}

                                viewport={{
                                    once:true
                                }}

                                className="
                                    relative
                                "

                            >


                                <div
                                    className="
                                        absolute
                                        inset-0
                                        bg-yellow-400/20
                                        blur-3xl
                                        rounded-[40px]
                                    "
                                />


                                <img

                                    src="/images/fourpics/crane1.jpg"

                                    className="
                                        relative
                                        rounded-[40px]
                                        w-full
                                        h-137.5
                                        object-cover
                                        border
                                        border-yellow-400/30
                                    "

                                />



                            </motion.div>



                        </div>


                    </div>


                </section>

                                {/* LOCATION WITH GOOGLE MAP */}


                <section
                    className="
                        pb-32
                    "
                >


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
                                gap-10
                                items-center
                            "

                        >



                            {/* LOCATION DETAILS */}


                            <div>


                                <span
                                    className="
                                        text-yellow-400
                                        font-semibold
                                        tracking-widest
                                    "
                                >

                                    OUR LOCATION

                                </span>




                                <h2
                                    className="
                                        mt-5
                                        text-4xl
                                        md:text-6xl
                                        font-black
                                    "
                                >

                                    Visit Our

                                    <span
                                        className="
                                            text-yellow-400
                                        "
                                    >
                                        {" "}Office
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

                                    Visit the ALIBATON office for
                                    professional support regarding
                                    trucking operations, crane services,
                                    heavy equipment transportation,
                                    and project coordination.

                                </p>





                                <div
                                    className="
                                        mt-8
                                        rounded-2xl
                                        bg-zinc-900
                                        border
                                        border-yellow-400/20
                                        p-6
                                    "
                                >



                                    <div
                                        className="
                                            flex
                                            gap-4
                                            items-start
                                        "
                                    >


                                        <div
                                            className="
                                                bg-yellow-400
                                                text-black
                                                p-3
                                                rounded-xl
                                            "
                                        >

                                            <MapPin />

                                        </div>




                                        <div>


                                            <h3
                                                className="
                                                    text-xl
                                                    font-bold
                                                "
                                            >

                                                ALIBATON Headquarters

                                            </h3>




                                            <p
                                                className="
                                                    mt-2
                                                    text-gray-400
                                                "
                                            >

                                                137 Panay Ave,
                                                Quezon City,
                                                Metro Manila

                                            </p>




                                            <p
                                                className="
                                                    mt-2
                                                    text-yellow-400
                                                    font-semibold
                                                "
                                            >

                                                (02) 8253 6817

                                            </p>


                                        </div>


                                    </div>



                                </div>



                            </div>







                            {/* GOOGLE MAP */}



                            <motion.div

                                initial={{
                                    opacity:0,
                                    scale:.9
                                }}

                                whileInView={{
                                    opacity:1,
                                    scale:1
                                }}

                                viewport={{
                                    once:true
                                }}

                                className="
                                    h-112.5
                                    overflow-hidden
                                    rounded-[40px]
                                    border
                                    border-yellow-400/20
                                "

                            >


                                <iframe

                                    src="
                                    https://www.google.com/maps?q=137%20Panay%20Ave%20Quezon%20City%20Metro%20Manila&output=embed
                                    "

                                    width="100%"

                                    height="100%"

                                    style={{
                                        border:0
                                    }}

                                    loading="lazy"

                                    allowFullScreen

                                />


                            </motion.div>



                        </motion.div>


                    </div>


                </section>






                <Footer />


            </div>

        </>
    );

}







function ContactLine({

    icon,

    title,

    value,

}:{

    icon:React.ReactNode;

    title:string;

    value:string;

}){


    return (

        <div
            className="
                flex
                items-center
                gap-5
            "
        >



            <div
                className="
                    h-14
                    w-14
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




            <div>


                <p
                    className="
                        text-sm
                        text-gray-500
                    "
                >

                    {title}

                </p>




                <p
                    className="
                        text-lg
                        font-semibold
                    "
                >

                    {value}

                </p>



            </div>



        </div>

    );

}
