import { Link } from "@inertiajs/react";
import {
    type ReactNode,
    type HTMLAttributeAnchorTarget,
} from "react";

import {
    MapPin,
    Phone,
    Mail,
    Clock,
} from "lucide-react";

import {
    FaFacebookF,
    FaLinkedinIn,
    FaXTwitter,
} from "react-icons/fa6";

import { motion } from "motion/react";

export default function Footer() {
    return (
        <footer
            className="
                relative
                overflow-hidden
                border-t
                border-yellow-400/10
                bg-[#050505]
            "
        >
            {/* =====================================================
                GLOW
            ====================================================== */}

            <div
                className="
                    pointer-events-none
                    absolute
                    bottom-0
                    left-1/2
                    h-[300px]
                    w-[600px]
                    -translate-x-1/2
                    rounded-full
                    bg-yellow-400/10
                    blur-[140px]
                "
            />

            <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{
                    once: true,
                    amount: 0.2,
                }}
                variants={{
                    hidden: {
                        opacity: 0,
                    },

                    show: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.15,
                        },
                    },
                }}
                className="
                    relative
                    mx-auto
                    max-w-7xl
                    px-6
                    py-20
                "
            >
                <div
                    className="
                        grid
                        gap-10
                        sm:grid-cols-2
                        lg:grid-cols-4
                    "
                >
                    {/* =================================================
                        COMPANY
                    ================================================== */}

                    <FooterBox>
                        <h3
                            className="
                                text-3xl
                                font-black
                                tracking-widest
                            "
                        >
                            <span className="text-yellow-400">
                                ALI
                            </span>

                            <span className="text-white">
                                BATON
                            </span>
                        </h3>

                        <p
                            className="
                                mt-2
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.18em]
                                text-yellow-400/70
                            "
                        >
                            Heavy Equipment &amp; Logistics
                        </p>

                        <p
                            className="
                                mt-6
                                leading-relaxed
                                text-gray-400
                            "
                        >
                            Advanced logistics management system
                            for heavy hauling, crane operations,
                            project coordination, billing,
                            payments, contracts, permits, and
                            compliance management.
                        </p>

                        <div
                            className="
                                mt-8
                                flex
                                gap-4
                            "
                        >
                            <Social href="https://www.facebook.com/alibatoncons">
                                <FaFacebookF size={18} />
                            </Social>

                            <Social href="https://linkedin.com">
                                <FaLinkedinIn size={18} />
                            </Social>

                            <Social href="https://x.com">
                                <FaXTwitter size={18} />
                            </Social>
                        </div>
                    </FooterBox>

                    {/* =================================================
                        EMPTY COLUMN
                        Keeps Solutions and Contact in their original
                        desktop positions after removing Navigation.
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="hidden lg:block"
                    />

                    {/* =================================================
                        SOLUTIONS
                    ================================================== */}

                    <FooterBox>
                        <FooterTitle>
                            Solutions
                        </FooterTitle>

                        <Service
                            href="/solutions/heavy-hauling"
                            target="_blank"
                        >
                            Heavy Hauling
                        </Service>

                        <Service
                            href="/solutions/crane-operations"
                            target="_blank"
                        >
                            Crane Operations
                        </Service>

                        <Service
                            href="/solutions/billing-invoicing"
                            target="_blank"
                        >
                            Billing &amp; Invoicing
                        </Service>

                        <Service
                            href="/solutions/payment-management"
                            target="_blank"
                        >
                            Payment Management
                        </Service>

                        <Service
                            href="/solutions/contract-permit"
                            target="_blank"
                        >
                            Contract &amp; Permit Management
                        </Service>
                    </FooterBox>

                    {/* =================================================
                        CONTACT
                    ================================================== */}

                    <FooterBox>
                        <FooterTitle>
                            Contact
                        </FooterTitle>

                        <a
                            href="https://www.google.com/maps/search/?api=1&query=137+Panay+Ave+Quezon+City+Metro+Manila+Philippines"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ContactItem
                                icon={<MapPin size={18} />}
                            >
                                137 Panay Ave, Quezon City,
                                Metro Manila, Philippines
                            </ContactItem>
                        </a>

                        <a href="tel:+639123456789">
                            <ContactItem
                                icon={<Phone size={18} />}
                            >
                                +63 912 345 6789
                            </ContactItem>
                        </a>

                        <a href="mailto:alibaton@gmail.com">
                            <ContactItem
                                icon={<Mail size={18} />}
                            >
                                alibaton@gmail.com
                            </ContactItem>
                        </a>

                        <ContactItem
                            icon={<Clock size={18} />}
                        >
                            Mon - Sat | 8AM - 6PM
                        </ContactItem>
                    </FooterBox>
                </div>

                {/* =====================================================
                    BOTTOM
                ====================================================== */}

                <motion.div
                    variants={{
                        hidden: {
                            opacity: 0,
                            y: 30,
                        },

                        show: {
                            opacity: 1,
                            y: 0,
                        },
                    }}
                    className="
                        mt-16
                        flex
                        flex-col
                        items-center
                        justify-between
                        gap-5
                        border-t
                        border-white/10
                        pt-8
                        text-gray-500
                        md:flex-row
                    "
                >
                    <p className="text-center md:text-left">
                        © {new Date().getFullYear()} ALIBATON Heavy
                        Equipment &amp; Logistics. All Rights Reserved.
                    </p>

                    <div
                        className="
                            flex
                            gap-6
                        "
                    >
                        <Link
                            href="/privacy-policy"
                            className="
                                transition-all
                                duration-300
                                hover:-translate-y-1
                                hover:text-yellow-400
                            "
                        >
                            Privacy Policy
                        </Link>

                        <Link
                            href="/terms"
                            className="
                                transition-all
                                duration-300
                                hover:-translate-y-1
                                hover:text-yellow-400
                            "
                        >
                            Terms
                        </Link>
                    </div>
                </motion.div>
            </motion.div>
        </footer>
    );
}

/* =========================================================
   FOOTER BOX
========================================================= */

function FooterBox({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <motion.div
            variants={{
                hidden: {
                    opacity: 0,
                    y: 40,
                },

                show: {
                    opacity: 1,
                    y: 0,
                },
            }}
            transition={{
                duration: 0.7,
            }}
            className="
                rounded-3xl
                p-6
            "
        >
            {children}
        </motion.div>
    );
}

/* =========================================================
   FOOTER TITLE
========================================================= */

function FooterTitle({
    children,
}: {
    children: string;
}) {
    return (
        <h4
            className="
                mb-6
                text-xl
                font-bold
                text-white
            "
        >
            {children}
        </h4>
    );
}

/* =========================================================
   SOLUTION LINK
========================================================= */

function Service({
    href,
    target = "_self",
    children,
}: {
    href: string;
    target?: HTMLAttributeAnchorTarget;
    children: ReactNode;
}) {
    return (
        <a
            href={href}
            target={target}
            rel={
                target === "_blank"
                    ? "noopener noreferrer"
                    : undefined
            }
            className="
                mb-4
                block
                cursor-pointer
                text-gray-400
                transition-all
                duration-300
                hover:translate-x-2
                hover:text-yellow-400
            "
        >
            {children}
        </a>
    );
}

/* =========================================================
   CONTACT ITEM
========================================================= */

function ContactItem({
    icon,
    children,
}: {
    icon: ReactNode;
    children: string;
}) {
    return (
        <div
            className="
                mb-4
                flex
                items-center
                gap-3
                text-gray-400
                transition-all
                duration-300
                hover:translate-x-2
                hover:text-white
            "
        >
            <span className="text-yellow-400">
                {icon}
            </span>

            <span>{children}</span>
        </div>
    );
}

/* =========================================================
   SOCIAL
========================================================= */

function Social({
    children,
    href,
}: {
    children: ReactNode;
    href: string;
}) {
    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{
                scale: 1.2,
                y: -6,
                rotate: 5,
            }}
            whileTap={{
                scale: 0.9,
            }}
            transition={{
                type: "spring",
                stiffness: 300,
            }}
            className="
                flex
                h-10
                w-10
                cursor-pointer
                items-center
                justify-center
                rounded-xl
                border
                border-yellow-400/10
                bg-white/[0.02]
                text-yellow-400
                transition-all
                duration-300
                hover:border-yellow-400/30
                hover:bg-yellow-400/10
            "
        >
            {children}
        </motion.a>
    );
}