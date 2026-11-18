import { Head, Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileCheck2,
    ShieldCheck,
    ClipboardCheck,
    FileSignature,
    Clock3,
} from "lucide-react";

export default function ContractPermit() {
    const features = [
        "Contract and permit record management",
        "Client and project contract information",
        "Contract status monitoring",
        "Permit documentation",
        "Signed contract workflow",
        "Expiry and renewal monitoring",
    ];

    return (
        <>
            <Head title="Contract & Permit Management | ALIBATON" />

            <div className="min-h-screen bg-[#050505] text-white">
                {/* HEADER */}

                <header className="border-b border-yellow-400/10 bg-[#050505]/95 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                        <Link
                            href="/"
                            className="text-2xl font-black tracking-[0.18em]"
                        >
                            <span className="text-yellow-400">
                                ALI
                            </span>

                            <span className="text-white">
                                BATON
                            </span>
                        </Link>

                        <Link
                            href="/"
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                border
                                border-white/10
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                text-gray-300
                                hover:border-yellow-400/30
                                hover:text-yellow-400
                            "
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                    </div>
                </header>

                {/* HERO */}

                <section className="relative overflow-hidden border-b border-white/5">
                    <div
                        className="
                            pointer-events-none
                            absolute
                            left-1/2
                            top-0
                            h-[420px]
                            w-[700px]
                            -translate-x-1/2
                            rounded-full
                            bg-yellow-400/10
                            blur-[150px]
                        "
                    />

                    <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
                        <div className="max-w-4xl">
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-400/20 bg-yellow-400/[0.04] px-4 py-2">
                                <FileCheck2
                                    size={18}
                                    className="text-yellow-400"
                                />

                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON Solution
                                </span>
                            </div>

                            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                                Contract &amp; Permit Management
                            </h1>

                            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
                                Organize contracts, permits, signed documents,
                                client project requirements, approval
                                workflows, and expiration monitoring in one
                                centralized system.
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

                {/* OVERVIEW */}

                <section className="mx-auto max-w-7xl px-6 py-16">
                    <div className="grid gap-6 md:grid-cols-3">
                        <InfoCard
                            icon={<FileSignature size={22} />}
                            title="Contract Records"
                            text="Maintain organized client, project, and contract information."
                        />

                        <InfoCard
                            icon={<ShieldCheck size={22} />}
                            title="Approval Workflow"
                            text="Support review, correction, signing, and final contract processing."
                        />

                        <InfoCard
                            icon={<Clock3 size={22} />}
                            title="Expiry Monitoring"
                            text="Track active, expiring, expired, and archived contract records."
                        />
                    </div>

                    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                Solution Overview
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                Keep contracts and permits under control
                            </h2>

                            <p className="mt-5 leading-8 text-gray-400">
                                ALIBATON provides a structured workflow for
                                organizing contract and permit information
                                associated with clients and projects.
                            </p>

                            <p className="mt-4 leading-8 text-gray-400">
                                Records can move through the appropriate
                                review and signing process while supporting
                                documentation and expiration information
                                remain connected to the contract record.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-yellow-400/10 bg-yellow-400/[0.03] p-8">
                            <div className="flex items-center gap-3">
                                <ClipboardCheck
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
                                        className="flex items-start gap-3"
                                    >
                                        <CheckCircle2
                                            size={18}
                                            className="mt-0.5 shrink-0 text-yellow-400"
                                        />

                                        <p className="text-sm leading-6 text-gray-300">
                                            {feature}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* WORKFLOW */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                Contract Workflow
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                From preparation to active contract
                            </h2>

                            <p className="mt-4 leading-7 text-gray-500">
                                Contract records can be organized through
                                review, correction, signing, approval, and
                                activation.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-5 md:grid-cols-4">
                            <ProcessCard
                                number="01"
                                title="Prepare"
                                text="Create and organize the contract and project information."
                            />

                            <ProcessCard
                                number="02"
                                title="Review"
                                text="Coordinate contract checking, corrections, and required documentation."
                            />

                            <ProcessCard
                                number="03"
                                title="Sign"
                                text="Process signed contract documents and supporting records."
                            />

                            <ProcessCard
                                number="04"
                                title="Activate"
                                text="Maintain the approved contract and monitor its status and expiry."
                            />
                        </div>
                    </div>
                </section>

                {/* PERMIT SECTION */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <FileCheck2
                                        size={22}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black">
                                        Permit &amp; Supporting Documents
                                    </h2>

                                    <p className="mt-2 max-w-3xl leading-7 text-gray-500">
                                        Keep permit-related records and
                                        supporting project documentation
                                        connected to the appropriate contract
                                        and client records.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div className="flex flex-col gap-6 rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.04] p-8 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON Contract Management
                                </p>

                                <h2 className="mt-2 text-2xl font-black">
                                    Keep contracts, permits, and approvals
                                    organized.
                                </h2>
                            </div>

                            <Link
                                href="/contact"
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300"
                            >
                                Get in Touch
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}

                <footer className="border-t border-white/10">
                    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            © {new Date().getFullYear()} ALIBATON Heavy
                            Equipment &amp; Logistics. All Rights Reserved.
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
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-yellow-400/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                {icon}
            </div>

            <h3 className="mt-5 text-lg font-bold">
                {title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-gray-500">
                {text}
            </p>
        </div>
    );
}

function ProcessCard({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <span className="text-xs font-black tracking-[0.2em] text-yellow-400">
                {number}
            </span>

            <h3 className="mt-4 text-lg font-bold">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
                {text}
            </p>
        </div>
    );
}