import { Link } from "@inertiajs/react";
import { Truck } from "lucide-react";
import { motion } from "motion/react";


export default function GuestLayout({ children }) {

    return (

        <div
            className="
            min-h-screen
            bg-black
            flex
            items-center
            justify-center
            px-5
            overflow-hidden
            relative
            "
        >


            {/* BACKGROUND GLOW */}

            <div
                className="
                absolute
                w-[500px]
                h-[500px]
                bg-yellow-400/20
                blur-[150px]
                rounded-full
                "
            />


            <motion.div

                initial={{
                    opacity:0,
                    y:40
                }}

                animate={{
                    opacity:1,
                    y:0
                }}

                transition={{
                    duration:.7
                }}

                className="
                relative
                w-full
                max-w-md
                "

            >


                {/* LOGO */}

                <Link
                    href="/"
                    className="
                    flex
                    flex-col
                    items-center
                    mb-8
                    "
                >

                    <div
                        className="
                        w-20
                        h-20
                        rounded-2xl
                        bg-yellow-400
                        flex
                        items-center
                        justify-center
                        text-black
                        shadow-xl
                        "
                    >

                        <Truck size={42}/>

                    </div>


                    <h1
                        className="
                        mt-4
                        text-3xl
                        font-black
                        text-white
                        "
                    >

                        CRANE
                        <span className="text-yellow-400">
                            TRUCKING
                        </span>

                    </h1>


                </Link>




                {/* FORM CARD */}

                <div
                    className="
                    bg-white
                    rounded-3xl
                    shadow-2xl
                    px-6
                    py-8
                    sm:px-10
                    "
                >

                    {children}

                </div>


            </motion.div>


        </div>

    );
}