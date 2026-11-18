import { Head, Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CreditCard,
    ShieldCheck,
    CircleDollarSign,
    Mail,
    FileCheck2,
} from "lucide-react";

export default function PaymentManagement() {
    const features = [
        "Payment status monitoring",
        "Partial and full payment tracking",
        "Payment approval and rejection workflow",
        "Payment date and transaction records",
        "Client payment communication",
        "Statement and payment documentation",
    ];

    return (
        <>
            <Head title="Payment Management | ALIBATON" />

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
                                <CreditCard
                                    size={18}
                                    className="text-yellow-400"
                                />

                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON Solution
                                </span>
                            </div>

                            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                                Payment Management
                            </h1>

                            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
                                Manage payment records, payment status,
                                approvals, partial payments, due amounts,
                                and supporting payment information through
                                a centralized workflow.
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

                {/* OVERVIEW CARDS */}

                <section className="mx-auto max-w-7xl px-6 py-16">
                    <div className="grid gap-6 md:grid-cols-3">
                        <InfoCard
                            icon={<CircleDollarSign size={22} />}
                            title="Payment Tracking"
                            text="Monitor due, partial, and fully paid financial records."
                        />

                        <InfoCard
                            icon={<ShieldCheck size={22} />}
                            title="Approval Workflow"
                            text="Keep payment approval and rejection under the appropriate workflow."
                        />

                        <InfoCard
                            icon={<FileCheck2 size={22} />}
                            title="Payment Records"
                            text="Maintain dates, transaction details, and supporting payment information."
                        />
                    </div>

                    {/* CONTENT */}

                    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                Solution Overview
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                Keep payment activity organized
                            </h2>

                            <p className="mt-5 leading-8 text-gray-400">
                                ALIBATON provides a structured payment
                                management workflow that connects payment
                                information with invoices, clients, and
                                financial records.
                            </p>

                            <p className="mt-4 leading-8 text-gray-400">
                                Payment records can move through the
                                appropriate status while maintaining
                                supporting information needed by staff and
                                administrators.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-yellow-400/10 bg-yellow-400/[0.03] p-8">
                            <h2 className="text-xl font-black">
                                Included Capabilities
                            </h2>

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

                {/* PAYMENT FLOW */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                Payment Workflow
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                From due invoice to completed payment
                            </h2>

                            <p className="mt-4 leading-7 text-gray-500">
                                The payment workflow provides a clear
                                structure for recording, reviewing, and
                                completing client payment transactions.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-5 md:grid-cols-4">
                            <ProcessCard
                                number="01"
                                title="Due"
                                text="Identify invoices and financial records requiring payment."
                            />

                            <ProcessCard
                                number="02"
                                title="Record"
                                text="Capture the payment transaction and supporting details."
                            />

                            <ProcessCard
                                number="03"
                                title="Review"
                                text="Process the appropriate payment approval or status workflow."
                            />

                            <ProcessCard
                                number="04"
                                title="Complete"
                                text="Maintain the final payment record and financial history."
                            />
                        </div>
                    </div>
                </section>

                {/* COMMUNICATION */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <Mail
                                        size={22}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black">
                                        Payment Communication
                                    </h2>

                                    <p className="mt-2 max-w-3xl leading-7 text-gray-500">
                                        ALIBATON can support payment-related
                                        communication and documentation so
                                        that relevant financial information
                                        remains connected to the payment
                                        workflow.
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
                                    ALIBATON Payment Management
                                </p>

                                <h2 className="mt-2 text-2xl font-black">
                                    Keep every payment record organized.
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