import { Link, usePage } from "@inertiajs/react";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
    const [open, setOpen] = useState(false);

    const { url } = usePage();

    const isHome = url === "/";

    return (
        <header
            className="
            fixed
            top-4
            left-1/2
            -translate-x-1/2
            z-50
            w-[calc(100%-2rem)]
            max-w-7xl
            "
        >
            <motion.div
                initial={
                    isHome
                        ? {
                              opacity: 0,
                              y: -80,
                              scale: 0.85,
                          }
                        : false
                }
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                }}
                transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                }}
                className="
                bg-black/70
                backdrop-blur-2xl
                border
                border-white/10
                rounded-3xl
                shadow-2xl
                shadow-black/50
                overflow-hidden
                "
            >
                <div
                    className="
                    h-20
                    px-5
                    md:px-8
                    flex
                    items-center
                    justify-between
                    "
                >
                    {/* LOGO + BRAND */}

                    <Link href="/" className="flex items-center gap-2">
                        <motion.div
                            whileHover={{
                                scale: 1.08,
                                rotate: 3,
                            }}
                            className="
                            relative
                            h-12
                            w-12
                            md:h-14
                            md:w-14
                            rounded-2xl
                            bg-white
                            flex
                            items-center
                            justify-center
                            shadow-lg
                            shadow-black/20
                            overflow-hidden
                            shrink-0
                            "
                        >
                            <img
                                src="/images/logo.jpg"
                                alt="ALIBATON Logo"
                                className="
                                relative
                                z-10
                                w-9
                                h-9
                                md:w-12
                                md:h-12
                                object-contain
                                "
                            />
                        </motion.div>

                        {/* BRAND TEXT */}

                        <div className="leading-tight">
                            <h1
                                className="
                                text-lg
                                md:text-2xl
                                font-black
                                tracking-wide
                                leading-none
                                "
                            >
                                <span className="text-yellow-400">ALI</span>

                                <span className="text-white">BATON</span>
                            </h1>

                            <p
                                className="
                                hidden
                                sm:block
                                text-[10px]
                                text-gray-400
                                tracking-[0.25em]
                                mt-1
                                "
                            >
                                DIGITAL LOGISTICS SYSTEM
                            </p>
                        </div>
                    </Link>

                    {/* DESKTOP MENU */}

                    <nav
                        className="
                        hidden
                        lg:flex
                        items-center
                        gap-8
                        "
                    >
                        <NavItem href="/" text="Home" active={url === "/"} />

                        <NavItem
                            href="/about"
                            text="About"
                            active={url.startsWith("/about")}
                        />

                        <NavItem
                            href="/services"
                            text="Services"
                            active={url.startsWith("/services")}
                        />

                        <NavItem
                            href="/features"
                            text="Features"
                            active={url.startsWith("/features")}
                        />

                        <NavItem
                            href="/contact"
                            text="Contact"
                            active={url.startsWith("/contact")}
                        />
                    </nav>

                    {/* MOBILE BUTTON */}

                    <button
                        onClick={() => setOpen(!open)}
                        className="
                        lg:hidden
                        text-yellow-400
                        "
                    >
                        {open ? <X size={30} /> : <Menu size={30} />}
                    </button>
                </div>

                {/* MOBILE MENU */}

                <motion.div
                    animate={{
                        height: open ? "auto" : 0,
                        opacity: open ? 1 : 0,
                    }}
                    transition={{
                        duration: 0.3,
                    }}
                    className="
                    lg:hidden
                    overflow-hidden
                    "
                >
                    <div
                        className="
                        px-6
                        pb-6
                        flex
                        flex-col
                        gap-5
                        "
                    >
                        <NavItem href="/" text="Home" active={url === "/"} />

                        <NavItem
                            href="/about"
                            text="About"
                            active={url.startsWith("/about")}
                        />

                        <NavItem
                            href="/services"
                            text="Services"
                            active={url.startsWith("/services")}
                        />

                        <NavItem
                            href="/features"
                            text="Features"
                            active={url.startsWith("/features")}
                        />

                        <NavItem
                            href="/contact"
                            text="Contact"
                            active={url.startsWith("/contact")}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </header>
    );
}

function NavItem({
    href,

    text,

    active,
}: {
    href: string;

    text: string;

    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`

            relative

            font-semibold

            transition-all

            duration-300

            group

            ${
                active
                    ? "text-yellow-400"
                    : "text-gray-300 hover:text-yellow-400"
            }

            `}
        >
            {text}

            <span
                className={`

                absolute

                left-0

                -bottom-1.75

                h-0.5

                bg-yellow-400

                transition-all

                duration-500

                ${active ? "w-full" : "w-0 group-hover:w-full"}

                `}
            />
        </Link>
    );
}
