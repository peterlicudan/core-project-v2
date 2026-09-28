import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, CheckCircle, X } from "lucide-react";
import { useState } from "react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type LoginPageProps = {
    status?: string;
};

/*
|--------------------------------------------------------------------------
| LOGIN PAGE
|--------------------------------------------------------------------------
*/

export default function Login() {
    const { props } = usePage<LoginPageProps>();

    const [showPassword, setShowPassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(Boolean(props.status));

    const { data, setData, post, processing, errors } = useForm({
        email: "",
        password: "",
    });

    /*
    |--------------------------------------------------------------------------
    | LOGIN SUBMIT
    |--------------------------------------------------------------------------
    */

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        post("/login");
    }

    return (
        <>
            <Head title="Login | ALIBATON" />

            <div
                className="
                    h-screen
                    grid
                    lg:grid-cols-2
                    relative
                    overflow-hidden
                "
            >
                {/* =========================================================
                    BACKGROUND
                ========================================================= */}

                <div
                    className="
                        absolute
                        inset-0
                        bg-[url('/images/big2.jpg')]
                        bg-cover
                        bg-center
                    "
                />

                {/* BLUR */}

                <div
                    className="
                        absolute
                        inset-0
                        backdrop-blur-sm
                        scale-105
                    "
                />

                {/* OVERLAY */}

                <div
                    className="
                        absolute
                        inset-0
                        bg-black/65
                    "
                />

                {/* =========================================================
                    LEFT SIDE
                ========================================================= */}

                <div
                    className="
                        hidden
                        lg:flex
                        relative
                        z-10
                        items-center
                        px-12
                        xl:px-20
                    "
                >
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
                        className="
                            text-white
                            max-w-xl
                        "
                    >
                        <h1
                            className="
                                text-5xl
                                xl:text-6xl
                                font-black
                                leading-tight
                            "
                        >
                            Manage Your Future
                            <br />
                            <span
                                className="
                                    text-yellow-400
                                "
                            >
                                With Crane Technology
                            </span>
                        </h1>

                        <p
                            className="
                                mt-5
                                text-gray-300
                                text-lg
                                leading-relaxed
                            "
                        >
                            Access your ALIBATON Heavy Equipment & Logistics
                            Management System. Monitor projects, equipment,
                            operations, and company services digitally.
                        </p>

                        <div
                            className="
                                grid
                                grid-cols-2
                                gap-5
                                mt-8
                            "
                        >
                            <div
                                className="
                                    bg-white/10
                                    border
                                    border-white/20
                                    rounded-2xl
                                    p-5
                                    backdrop-blur-md
                                "
                            >
                                <h3
                                    className="
                                        text-yellow-400
                                        font-black
                                        text-lg
                                    "
                                >
                                    Heavy Equipment
                                </h3>

                                <p
                                    className="
                                        text-gray-400
                                        text-sm
                                        mt-2
                                    "
                                >
                                    Advanced crane units and professional
                                    operators.
                                </p>
                            </div>

                            <div
                                className="
                                    bg-white/10
                                    border
                                    border-white/20
                                    rounded-2xl
                                    p-5
                                    backdrop-blur-md
                                "
                            >
                                <h3
                                    className="
                                        text-yellow-400
                                        font-black
                                        text-lg
                                    "
                                >
                                    Safe Operations
                                </h3>

                                <p
                                    className="
                                        text-gray-400
                                        text-sm
                                        mt-2
                                    "
                                >
                                    Reliable lifting solutions for every
                                    project.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* =========================================================
                    LOGIN CARD
                ========================================================= */}

                <div
                    className="
                        relative
                        z-10
                        flex
                        items-center
                        justify-center
                        px-5
                    "
                >
                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: 0.9,
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                        }}
                        transition={{
                            duration: 0.6,
                        }}
                        className="
                            w-full
                            max-w-md
                            bg-white/10
                            backdrop-blur-xl
                            border
                            border-white/20
                            rounded-[30px]
                            shadow-2xl
                            p-6
                        "
                    >
                        {/* =================================================
                            LOGO
                        ================================================= */}

                        <div
                            className="
                                flex
                                justify-center
                            "
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.03, 1],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                }}
                                className="
                                    w-16
                                    h-16
                                    rounded-2xl
                                    bg-yellow-400
                                    flex
                                    items-center
                                    justify-center
                                    shadow-lg
                                "
                            >
                                <img
                                    src="/images/logo.jpg"
                                    alt="ALIBATON Logo"
                                    className="
                                        w-16
                                        h-16
                                        object-contain
                                        rounded-2xl
                                    "
                                />
                            </motion.div>
                        </div>

                        <h1
                            className="
                                mt-4
                                text-3xl
                                font-black
                                text-center
                                text-white
                            "
                        >
                            Welcome Back
                        </h1>

                        <p
                            className="
                                text-center
                                text-gray-200
                                text-sm
                                mt-2
                            "
                        >
                            Login to ALIBATON Management System
                        </p>

                        {/* =================================================
                            LOGIN FORM
                        ================================================= */}

                        <form
                            onSubmit={submit}
                            className="
                                mt-5
                                space-y-3
                            "
                        >
                            {/* EMAIL */}

                            <div>
                                <label
                                    htmlFor="email"
                                    className="
                                        text-sm
                                        font-bold
                                        text-white
                                    "
                                >
                                    Email Address
                                </label>

                                <div
                                    className="
                                        relative
                                        mt-1
                                    "
                                >
                                    <Mail
                                        size={17}
                                        className="
                                            absolute
                                            left-4
                                            top-3.5
                                            text-yellow-400
                                        "
                                    />

                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData("email", e.target.value)
                                        }
                                        placeholder="Email address"
                                        autoComplete="email"
                                        className="
                                            w-full
                                            h-12
                                            rounded-xl
                                            bg-white/90
                                            text-black
                                            pl-11
                                            border
                                            border-white/40
                                            focus:outline-none
                                            focus:ring-2
                                            focus:ring-yellow-400
                                            transition
                                        "
                                        required
                                    />
                                </div>

                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-400">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* PASSWORD */}

                            <div>
                                <label
                                    htmlFor="password"
                                    className="
                                        text-sm
                                        font-bold
                                        text-white
                                    "
                                >
                                    Password
                                </label>

                                <div
                                    className="
                                        relative
                                        mt-1
                                    "
                                >
                                    <Lock
                                        size={17}
                                        className="
                                            absolute
                                            left-4
                                            top-3.5
                                            text-yellow-400
                                        "
                                    />

                                    <input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={data.password}
                                        onChange={(e) =>
                                            setData("password", e.target.value)
                                        }
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        className="
                                            w-full
                                            h-12
                                            rounded-xl
                                            bg-white/90
                                            text-black
                                            pl-11
                                            pr-12
                                            border
                                            border-white/40
                                            focus:outline-none
                                            focus:ring-2
                                            focus:ring-yellow-400
                                            transition
                                            [&::-ms-reveal]:hidden
                                            [&::-ms-clear]:hidden
                                        "
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="
                                            absolute
                                            right-4
                                            top-3.5
                                            text-gray-600
                                            hover:text-yellow-500
                                        "
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>

                                {errors.password && (
                                    <p
                                        className="
                                            text-red-400
                                            text-xs
                                            mt-1
                                        "
                                    >
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* OPTIONS */}

                            <div
                                className="
                                    flex
                                    justify-between
                                    items-center
                                    text-sm
                                "
                            >
                                <Link
                                    href="/forgot-password"
                                    className="
                                        text-yellow-400
                                        font-bold
                                        hover:text-yellow-300
                                        transition
                                    "
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* LOGIN BUTTON */}

                            <button
                                type="submit"
                                disabled={processing}
                                className="
                                    w-full
                                    h-12
                                    rounded-xl
                                    bg-yellow-400/90
                                    text-black
                                    font-black
                                    mt-2
                                    hover:bg-yellow-300
                                    hover:-translate-y-1
                                    transition-all
                                    duration-300
                                    shadow-lg
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {processing ? "LOGGING IN..." : "LOGIN"}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>

            {/* =============================================================
                PASSWORD RESET SUCCESS MODAL
            ============================================================= */}

            <AnimatePresence>
                {showSuccess && props.status && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="
                            fixed
                            inset-0
                            z-9999
                            flex
                            items-center
                            justify-center
                            bg-black/60
                            px-4
                            backdrop-blur-md
                        "
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.85,
                                y: 20,
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.9,
                                y: 20,
                            }}
                            transition={{
                                duration: 0.3,
                            }}
                            className="
                                relative
                                w-full
                                max-w-md
                                rounded-3xl
                                border
                                border-green-400/20
                                bg-black/90
                                p-7
                                text-center
                                shadow-2xl
                                shadow-black/70
                                backdrop-blur-2xl
                            "
                        >
                            {/* CLOSE */}

                            <button
                                type="button"
                                onClick={() => setShowSuccess(false)}
                                className="
                                    absolute
                                    right-4
                                    top-4
                                    rounded-full
                                    p-2
                                    text-white/40
                                    transition
                                    hover:bg-white/10
                                    hover:text-white
                                "
                                aria-label="Close notification"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* SUCCESS ICON */}

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-20
                                    w-20
                                    items-center
                                    justify-center
                                    rounded-full
                                    border
                                    border-green-400/20
                                    bg-green-400/10
                                    shadow-lg
                                    shadow-green-400/10
                                "
                            >
                                <CheckCircle
                                    className="
                                        h-10
                                        w-10
                                        text-green-400
                                    "
                                />
                            </div>

                            {/* TITLE */}

                            <h2
                                className="
                                    mt-5
                                    text-2xl
                                    font-black
                                    text-white
                                "
                            >
                                Password Changed Successfully
                            </h2>

                            {/* MESSAGE */}

                            <p
                                className="
                                    mx-auto
                                    mt-3
                                    max-w-sm
                                    text-sm
                                    leading-6
                                    text-white/50
                                "
                            >
                                Your password has been updated successfully. You
                                can now log in using your new password.
                            </p>

                            {/* STATUS */}

                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    border
                                    border-green-400/10
                                    bg-green-400/5
                                    px-4
                                    py-3
                                    text-xs
                                    leading-5
                                    text-green-300/70
                                "
                            >
                                {props.status}
                            </div>

                            {/* CONTINUE */}

                            <button
                                type="button"
                                onClick={() => setShowSuccess(false)}
                                className="
                                    mt-6
                                    w-full
                                    rounded-2xl
                                    bg-yellow-400
                                    px-5
                                    py-4
                                    text-sm
                                    font-black
                                    text-black
                                    shadow-lg
                                    shadow-yellow-400/10
                                    transition
                                    hover:bg-yellow-300
                                    hover:shadow-yellow-400/20
                                "
                            >
                                Continue to Login
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
