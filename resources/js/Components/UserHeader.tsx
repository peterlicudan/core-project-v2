import { usePage } from "@inertiajs/react";
import { useState } from "react";

type UserData = {
    id?: number;
    name?: string;
    email?: string;
};

type PageProps = {
    auth?: {
        user?: UserData;
    };
};

export default function UserHeader() {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    // =====================================================
    // HEADER
    // =====================================================

    return (
        <header
            className="
                sticky
                top-0
                z-30
                w-full
                border-b
                border-yellow-400/10
                bg-black/90
                backdrop-blur-xl
            "
        >
            <div
                className="
                    flex
                    min-h-18
                    items-center
                    justify-between
                    gap-4
                    px-4
                    sm:px-6
                    lg:px-8
                "
            >
                {/* =====================================================
                    BRAND
                ====================================================== */}

                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/70">
                        ALIBATON
                    </p>

                    <p className="truncate text-sm font-semibold text-white sm:text-base">
                        Heavy Equipment & Logistics
                    </p>
                </div>

                {/* =====================================================
                    RIGHT SIDE
                ====================================================== */}

                <div className="flex shrink-0 items-center gap-3">

                    {/* =================================================
                        SINGLE USER PROFILE
                    ================================================== */}

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            border-l
                            border-slate-800
                            pl-3
                        "
                    >
                        {/* Avatar */}

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-yellow-400
                                text-sm
                                font-black
                                text-black
                            "
                        >
                            {user?.name
                                ? user.name
                                      .charAt(0)
                                      .toUpperCase()
                                : "U"}
                        </div>

                        {/* Name — PANGALAN LANG, WALANG EMAIL */}

                        <div className="hidden max-w-37.5 sm:block">
                            <p
                                className="
                                    truncate
                                    text-sm
                                    font-bold
                                    text-white
                                "
                            >
                                {user?.name ?? "User"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
