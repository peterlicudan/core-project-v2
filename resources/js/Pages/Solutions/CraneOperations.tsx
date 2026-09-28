import { Head, Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Construction,
    ClipboardCheck,
    ShieldCheck,
    Settings2,
    FileCheck2,
} from "lucide-react";

export default function CraneOperations() {
    const features = [
        "Crane project coordination",
        "Equipment assignment monitoring",
        "Job order management",
        "Permit and contract tracking",
        "Project documentation",
        "Operational status monitoring",
    ];

    return (
        <>
            <Head title="Crane Operations | ALIBATON" />

            <div className="min-h-screen bg-[#050505] text-white">
                <header className="border-b border-yellow-400/10">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                        <Link
                            href="/"
                            className="text-2xl font-black tracking-[0.18em]"
                        >
                            <span className="text-yellow-400">ALI</span>
                            <span className="text-white">BATON</span>
                        </Link>

                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-yellow-400/30 hover:text-yellow-400"
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                    </div>
                </header>

                <section className="relative overflow-hidden border-b border-white/5">
                    <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[150px]" />

                    <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
                        <div className="max-w-4xl">
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-400/20 bg-yellow-400/[0.04] px-4 py-2">
                                <Construction
                                    size={18}
                                    className="text-yellow-400"
                                />

                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON Solution
                                </span>
                            </div>

                            <h1 className="text-4xl font-black sm:text-6xl">
                                Crane Operations
                            </h1>

                            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
                                Organize crane operations, equipment
                                assignments, project requirements,
                                documentation, permits, and operational
                                records through one centralized platform.
                            </p>

                            <div className="mt-8">
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300"
                                >
                                    Contact ALIBATON
                                    <ArrowRight size={17} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-6 py-16">
                    <div className="grid gap-6 md:grid-cols-3">
                        <InfoCard
                            icon={<Settings2 size={22} />}
                            title="Equipment Coordination"
                            text="Track crane assignments and operational requirements across projects."
                        />

                        <InfoCard
                            icon={<ClipboardCheck size={22} />}
                            title="Project Control"
                            text="Connect crane-related job orders to clients, projects, and supporting records."
                        />

                        <InfoCard
                            icon={<FileCheck2 size={22} />}
                            title="Permit Management"
                            text="Keep contracts, permits, and supporting documents organized and accessible."
                        />
                    </div>

                    <div className="mt-10 grid gap-8 lg:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                Solution Overview
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                Centralized crane operation management
                            </h2>

                            <p className="mt-5 leading-8 text-gray-400">
                                ALIBATON gives teams a centralized workspace
                                for crane-related project information,
                                equipment assignments, job orders,
                                documentation, contracts, permits, and
                                financial records.
                            </p>

                            <p className="mt-4 leading-8 text-gray-400">
                                This helps operations teams maintain a
                                consistent record of activities from project
                                preparation through completion.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-yellow-400/10 bg-yellow-400/[0.03] p-8">
                            <div className="flex items-center gap-3">
                                <ShieldCheck
                                    size={22}
                                    className="text-yellow-400"
                                />

                                <h2 className="text-xl font-black">
                                    Included Capabilities
                                </h2>
                            </div>

                            <div className="mt-6 space-y-4">
                                {features.map((feature) => (
                                    <div
                                        key={feature}
                                        className="flex gap-3"
                                    >
                                        <CheckCircle2
                                            size={18}
                                            className="mt-0.5 shrink-0 text-yellow-400"
                                        />

                                        <p className="text-sm text-gray-300">
                                            {feature}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="border-t border-white/10">
                    <div className="mx-auto flex max-w-7xl justify-between px-6 py-8 text-sm text-gray-500">
                        <p>
                            © {new Date().getFullYear()} ALIBATON Heavy
                            Equipment &amp; Logistics.
                        </p>

                        <Link
                            href="/contact"
                            className="text-yellow-400 hover:text-yellow-300"
                        >
                            Contact ALIBATON
                        </Link>
                    </div>
                </footer>
            </div>
        </>
    );
}

function InfoCard({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                {icon}
            </div>

            <h3 className="mt-5 text-lg font-bold">{title}</h3>

            <p className="mt-3 text-sm leading-7 text-gray-500">
                {text}
            </p>
        </div>
    );
}