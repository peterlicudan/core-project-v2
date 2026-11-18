import { Head, Link } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Receipt,
    Calculator,
    FileText,
    CircleDollarSign,
    ClipboardList,
} from "lucide-react";

export default function BillingInvoicing() {
    const features = [
        "Invoice generation from job and transaction records",
        "Invoice item and amount management",
        "VAT and withholding tax computation",
        "Invoice status monitoring",
        "Client and project billing records",
        "Export and reporting support",
    ];

    return (
        <>
            <Head title="Billing & Invoicing | ALIBATON" />

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
                                transition
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
                            <div
                                className="
                                    mb-6
                                    inline-flex
                                    items-center
                                    gap-3
                                    rounded-full
                                    border
                                    border-yellow-400/20
                                    bg-yellow-400/[0.04]
                                    px-4
                                    py-2
                                "
                            >
                                <Receipt
                                    size={18}
                                    className="text-yellow-400"
                                />

                                <span
                                    className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-[0.2em]
                                        text-yellow-400
                                    "
                                >
                                    ALIBATON Solution
                                </span>
                            </div>

                            <h1
                                className="
                                    text-4xl
                                    font-black
                                    tracking-tight
                                    sm:text-6xl
                                "
                            >
                                Billing &amp; Invoicing
                            </h1>

                            <p
                                className="
                                    mt-6
                                    max-w-3xl
                                    text-lg
                                    leading-8
                                    text-gray-400
                                "
                            >
                                Centralize billing records, invoice
                                preparation, transaction information,
                                tax calculations, and client project
                                billing within the ALIBATON platform.
                            </p>

                            <div className="mt-8">
                                <Link
                                    href="/contact"
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        bg-yellow-400
                                        px-6
                                        py-3
                                        text-sm
                                        font-black
                                        text-black
                                        transition
                                        hover:bg-yellow-300
                                    "
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
                            icon={<Calculator size={22} />}
                            title="Invoice Preparation"
                            text="Organize invoice items, quantities, descriptions, unit costs, and total amounts."
                        />

                        <InfoCard
                            icon={<CircleDollarSign size={22} />}
                            title="Financial Computation"
                            text="Support VAT, withholding tax, net amount, and total due calculations."
                        />

                        <InfoCard
                            icon={<ClipboardList size={22} />}
                            title="Billing Monitoring"
                            text="Monitor invoice records and their progress through the billing workflow."
                        />
                    </div>

                    {/* MAIN CONTENT */}

                    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                        <div
                            className="
                                rounded-3xl
                                border
                                border-white/10
                                bg-white/[0.03]
                                p-8
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-[0.2em]
                                    text-yellow-400
                                "
                            >
                                Solution Overview
                            </p>

                            <h2
                                className="
                                    mt-3
                                    text-3xl
                                    font-black
                                "
                            >
                                Organized billing from transaction
                                to invoice
                            </h2>

                            <p
                                className="
                                    mt-5
                                    leading-8
                                    text-gray-400
                                "
                            >
                                ALIBATON connects operational
                                transactions with the billing workflow,
                                allowing staff to prepare invoice
                                records based on actual project and
                                client information.
                            </p>

                            <p
                                className="
                                    mt-4
                                    leading-8
                                    text-gray-400
                                "
                            >
                                Billing records can include invoice
                                details, applicable taxes, amounts due,
                                and status information needed for
                                subsequent payment processing.
                            </p>
                        </div>

                        <div
                            className="
                                rounded-3xl
                                border
                                border-yellow-400/10
                                bg-yellow-400/[0.03]
                                p-8
                            "
                        >
                            <div className="flex items-center gap-3">
                                <FileText
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
                                            className="
                                                mt-0.5
                                                shrink-0
                                                text-yellow-400
                                            "
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
                            <p
                                className="
                                    text-xs
                                    font-bold
                                    uppercase
                                    tracking-[0.2em]
                                    text-yellow-400
                                "
                            >
                                Billing Workflow
                            </p>

                            <h2 className="mt-3 text-3xl font-black">
                                From transaction to client billing
                            </h2>

                            <p className="mt-4 leading-7 text-gray-500">
                                The billing workflow keeps operational
                                and financial information connected
                                throughout the invoicing process.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-5 md:grid-cols-4">
                            <ProcessCard
                                number="01"
                                title="Transaction"
                                text="Use the available project or transaction record as the billing reference."
                            />

                            <ProcessCard
                                number="02"
                                title="Invoice"
                                text="Prepare invoice items, amounts, taxes, and total due."
                            />

                            <ProcessCard
                                number="03"
                                title="Review"
                                text="Verify the billing information and related client or project records."
                            />

                            <ProcessCard
                                number="04"
                                title="Payment"
                                text="Continue the workflow through payment management."
                            />
                        </div>
                    </div>
                </section>

                {/* CTA */}

                <section className="border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-16">
                        <div
                            className="
                                flex
                                flex-col
                                gap-6
                                rounded-3xl
                                border
                                border-yellow-400/15
                                bg-yellow-400/[0.04]
                                p-8
                                md:flex-row
                                md:items-center
                                md:justify-between
                            "
                        >
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON Billing
                                </p>

                                <h2 className="mt-2 text-2xl font-black">
                                    Keep billing information organized
                                    and connected.
                                </h2>
                            </div>

                            <Link
                                href="/contact"
                                className="
                                    inline-flex
                                    shrink-0
                                    items-center
                                    gap-2
                                    rounded-xl
                                    bg-yellow-400
                                    px-6
                                    py-3
                                    text-sm
                                    font-black
                                    text-black
                                    hover:bg-yellow-300
                                "
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