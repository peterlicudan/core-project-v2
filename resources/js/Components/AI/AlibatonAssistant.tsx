import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";

import {
    AlertCircle,
    BarChart3,
    BriefcaseBusiness,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    CreditCard,
    Database,
    Download,
    FileBarChart,
    FileCheck2,
    FileText,
    Loader2,
    MessageCircle,
    Paperclip,
    Plus,
    Receipt,
    Send,
    ShieldCheck,
    Sparkles,
    Trash2,
    TrendingUp,
    Users,
    X,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ReportItem = {
    id: number;
    title: string;
    type: string;
    records: number;
    status: string;
    generated: string;
};

type VisualData = {
    counts?: Record<string, number>;
    financial?: Record<string, number>;
    statuses?: Record<string, Record<string, number>>;
};

type AIRecords = {
    staff?: Record<string, any>[];
    clients?: Record<string, any>[];
    invoices?: Record<string, any>[];
    payments?: Record<string, any>[];
    documents?: Record<string, any>[];
    compliance?: Record<string, any>[];
    contracts?: Record<string, any>[];
    job_orders?: Record<string, any>[];
};

type AIResponse = {
    message?: string;
    answer?: string;

    visual?: string;
    visualData?: VisualData;

    records?: AIRecords;

    report?: string;
    reportName?: string;

    reportUrl?: string;
    reportPath?: string;
    reportMimeType?: string;
    reportType?: string;
    reportGenerated?: boolean;

    error?: string;
};

type Message = {
    id: number;
    sender: "ai" | "user";
    text: string;
    createdAt: string;

    attachmentName?: string;

    visual?: string;
    visualData?: VisualData;

    records?: AIRecords;

    report?: string;
    reportName?: string;

    reportUrl?: string;
    reportPath?: string;
    reportMimeType?: string;
    reportType?: string;
    reportGenerated?: boolean;
};

type ChatSession = {
    id: string;
    title: string;
    createdAt: string;
    messages: Message[];
};

type Props = {
    reports?: ReportItem[];
};

/*
|--------------------------------------------------------------------------
| STORAGE KEYS
|--------------------------------------------------------------------------
*/

const STORAGE_KEY = "alibaton_ai_recent_chats";

const CURRENT_MESSAGES_KEY = "alibaton_ai_current_messages";

const CURRENT_INPUT_KEY = "alibaton_ai_current_input";

/*
|--------------------------------------------------------------------------
| FILE CONSTANTS
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "application/json",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".csv", ".json"];

/*
|--------------------------------------------------------------------------
| DEFAULT MESSAGE
|--------------------------------------------------------------------------
*/

const DEFAULT_MESSAGE: Message = {
    id: 1,
    sender: "ai",
    text:
        "Hi! I'm ALIBATON AI.\n\n" +
        "I can answer questions using the ALIBATON system data available to your account, including Billing, Invoices, Payments, Contracts & Permits, Documents, Compliance, Job Orders, Staff, Clients, and Reports.\n\n" +
        "Ask me a question about a specific module, and I will analyze the available system records.",
    createdAt: new Date().toISOString(),
};

/*
|--------------------------------------------------------------------------
| LOCAL STORAGE HELPERS
|--------------------------------------------------------------------------
*/

const loadStoredMessages = (): Message[] => {
    if (typeof window === "undefined") {
        return [DEFAULT_MESSAGE];
    }

    try {
        const saved = localStorage.getItem(CURRENT_MESSAGES_KEY);

        if (!saved) {
            return [DEFAULT_MESSAGE];
        }

        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }

        return [DEFAULT_MESSAGE];
    } catch (error) {
        console.error(
            "Unable to restore current ALIBATON AI conversation.",
            error,
        );

        return [DEFAULT_MESSAGE];
    }
};

const loadStoredInput = (): string => {
    if (typeof window === "undefined") {
        return "";
    }

    try {
        return localStorage.getItem(CURRENT_INPUT_KEY) ?? "";
    } catch (error) {
        console.error("Unable to restore ALIBATON AI prompt.", error);

        return "";
    }
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getCsrfToken = (): string => {
    const meta = document.querySelector(
        'meta[name="csrf-token"]',
    ) as HTMLMetaElement | null;

    if (meta?.content) {
        return meta.content;
    }

    // Fallback: XSRF-TOKEN cookie — sine-set ng Laravel sa bawat response,
    // kaya ito ang pinaka-fresh na token kahit ma-regenerate ang session.
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="));

    if (cookie) {
        try {
            return decodeURIComponent(cookie.split("=").slice(1).join("="));
        } catch {
            return "";
        }
    }

    return "";
};

/*
|--------------------------------------------------------------------------
| ✅ CSRF: una ang XSRF-TOKEN cookie (fresh sa bawat response), fallback meta
|--------------------------------------------------------------------------
*/

const getXsrfCookieToken = (): string => {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="));

    if (!cookie) return "";

    try {
        return decodeURIComponent(cookie.split("=").slice(1).join("="));
    } catch {
        return "";
    }
};

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return "—";
    }

    try {
        return new Date(value).toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return String(value);
    }
};

const formatMoney = (value: unknown) => {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) {
        return "₱0.00";
    }

    return `₱${number.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatNumber = (value: unknown) => {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("en-PH");
};

const humanizeKey = (key: string) => {
    return key
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getExtension = (filename: string) => {
    const index = filename.lastIndexOf(".");

    if (index === -1) {
        return "";
    }

    return filename.substring(index).toLowerCase();
};

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function AlibatonAssistant({ reports = [] }: Props) {
    const [open, setOpen] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | CURRENT PROMPT
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Lazy initialization loads the prompt from localStorage.
    | Therefore, refresh will NOT clear the text.
    |
    */

    const [input, setInput] = useState<string>(loadStoredInput);

    const [isLoading, setIsLoading] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | CURRENT CONVERSATION
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | The complete current conversation is restored after refresh.
    |
    */

    const [messages, setMessages] = useState<Message[]>(loadStoredMessages);

    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);

    const [showRecentChats, setShowRecentChats] = useState(false);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [fileError, setFileError] = useState("");

    const [expandedModules, setExpandedModules] = useState<
        Record<string, boolean>
    >({});

    const messagesContainerRef = useRef<HTMLDivElement | null>(null);

    const inputRef = useRef<HTMLInputElement | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    /*
    |--------------------------------------------------------------------------
    | LOAD RECENT CHATS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return;
            }

            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                setRecentChats(parsed);
            }
        } catch (error) {
            console.error("Unable to load ALIBATON AI chats.", error);
        }
    }, []);

    /*
    |--------------------------------------------------------------------------
    | SAVE RECENT CHATS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(recentChats.slice(0, 20)),
            );
        } catch (error) {
            console.error("Unable to save ALIBATON AI chats.", error);
        }
    }, [recentChats]);

    /*
    |--------------------------------------------------------------------------
    | SAVE CURRENT MESSAGES
    |--------------------------------------------------------------------------
    |
    | This is what makes the conversation survive refresh.
    |
    */

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            localStorage.setItem(
                CURRENT_MESSAGES_KEY,
                JSON.stringify(messages),
            );
        } catch (error) {
            console.error(
                "Unable to save current ALIBATON AI conversation.",
                error,
            );
        }
    }, [messages]);

    /*
    |--------------------------------------------------------------------------
    | SAVE CURRENT PROMPT
    |--------------------------------------------------------------------------
    |
    | This is what makes an UNSENT prompt survive refresh.
    |
    */

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            if (input.trim()) {
                localStorage.setItem(CURRENT_INPUT_KEY, input);
            } else {
                localStorage.removeItem(CURRENT_INPUT_KEY);
            }
        } catch (error) {
            console.error("Unable to save ALIBATON AI prompt.", error);
        }
    }, [input]);

    /*
    |--------------------------------------------------------------------------
    | AUTO SCROLL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const container = messagesContainerRef.current;

        if (!container) {
            return;
        }

        container.scrollTop = container.scrollHeight;
    }, [messages, isLoading]);

    /*
    |--------------------------------------------------------------------------
    | FOCUS INPUT
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    /*
    |--------------------------------------------------------------------------
    | REPORT SUMMARY
    |--------------------------------------------------------------------------
    */

    const reportSummary = useMemo(() => {
        return reports.map((report) => ({
            id: report.id,
            title: report.title,
            type: report.type,
            records: report.records,
            status: report.status,
            generated: report.generated,
        }));
    }, [reports]);

    /*
    |--------------------------------------------------------------------------
    | FILE SELECTION
    |--------------------------------------------------------------------------
    */

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        setFileError("");

        if (!file) {
            setSelectedFile(null);

            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setFileError("File is too large. Maximum allowed size is 10 MB.");

            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        const extension = getExtension(file.name);

        const validType = ALLOWED_FILE_TYPES.includes(file.type);

        const validExtension = ALLOWED_EXTENSIONS.includes(extension);

        if (!validType && !validExtension) {
            setFileError(
                "Unsupported file. Allowed: PDF, DOC, DOCX, TXT, CSV, JSON.",
            );

            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        setSelectedFile(file);
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);

        setFileError("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    /*
    |--------------------------------------------------------------------------
    | NEW CHAT
    |--------------------------------------------------------------------------
    */

    const createNewChat = () => {
        const newMessage: Message = {
            ...DEFAULT_MESSAGE,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        setMessages([newMessage]);

        setInput("");

        setSelectedFile(null);

        setFileError("");

        setExpandedModules({});

        setShowRecentChats(false);

        /*
            |--------------------------------------------------------------------------
            | Immediately clear persisted current conversation/prompt
            |--------------------------------------------------------------------------
            */

        try {
            localStorage.removeItem(CURRENT_INPUT_KEY);

            localStorage.setItem(
                CURRENT_MESSAGES_KEY,
                JSON.stringify([newMessage]),
            );
        } catch (error) {
            console.error("Unable to reset ALIBATON AI current chat.", error);
        }

        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE CHAT
    |--------------------------------------------------------------------------
    */

    const saveCurrentChat = (currentMessages: Message[]) => {
        if (currentMessages.length <= 1) {
            return;
        }

        const firstUserMessage = currentMessages.find(
            (message) => message.sender === "user",
        );

        const title =
            firstUserMessage?.text?.replace(/\s+/g, " ").trim().slice(0, 60) ||
            "ALIBATON AI Chat";

        const session: ChatSession = {
            id: Date.now().toString(),
            title,
            createdAt: new Date().toISOString(),
            messages: currentMessages,
        };

        setRecentChats((previous) =>
            [session, ...previous.filter((chat) => chat.title !== title)].slice(
                0,
                20,
            ),
        );
    };

    /*
    |--------------------------------------------------------------------------
    | LOAD CHAT
    |--------------------------------------------------------------------------
    */

    const loadChat = (chat: ChatSession) => {
        setMessages(chat.messages);

        setShowRecentChats(false);

        setExpandedModules({});

        setInput("");

        try {
            localStorage.setItem(
                CURRENT_MESSAGES_KEY,
                JSON.stringify(chat.messages),
            );

            localStorage.removeItem(CURRENT_INPUT_KEY);
        } catch (error) {
            console.error("Unable to persist loaded ALIBATON AI chat.", error);
        }

        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    /*
    |--------------------------------------------------------------------------
    | DELETE CHAT
    |--------------------------------------------------------------------------
    */

    const deleteChat = (event: React.MouseEvent, id: string) => {
        event.stopPropagation();

        setRecentChats((previous) => previous.filter((chat) => chat.id !== id));
    };

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD REPORT
    |--------------------------------------------------------------------------
    */

    const downloadReport = async (
        reportUrl?: string,
        report?: string,
        reportName?: string,
    ) => {
        try {
            if (reportUrl) {
                const response = await fetch(reportUrl, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        Accept: "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,application/octet-stream,*/*",
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `Unable to download report. HTTP ${response.status}`,
                    );
                }

                const blob = await response.blob();

                const objectUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");

                link.href = objectUrl;

                link.download =
                    reportName || `alibaton-ai-report-${Date.now()}.csv`;

                document.body.appendChild(link);

                link.click();

                link.remove();

                window.URL.revokeObjectURL(objectUrl);

                return;
            }

            if (report) {
                const blob = new Blob(["\uFEFF", report], {
                    type: "text/csv;charset=utf-8;",
                });

                const objectUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");

                link.href = objectUrl;

                link.download =
                    reportName || `alibaton-ai-report-${Date.now()}.csv`;

                document.body.appendChild(link);

                link.click();

                link.remove();

                window.URL.revokeObjectURL(objectUrl);

                return;
            }

            throw new Error(
                "No generated report file was returned by ALIBATON AI.",
            );
        } catch (error) {
            console.error("ALIBATON AI report download error:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to download the generated report.",
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | SEND MESSAGE
    |--------------------------------------------------------------------------
    */

    const sendMessage = async (customMessage?: string) => {
        const messageText = (customMessage ?? input).trim();

        if (!messageText || isLoading) {
            return;
        }

        const userMessage: Message = {
            id: Date.now(),
            sender: "user",
            text: messageText,
            createdAt: new Date().toISOString(),
            attachmentName: selectedFile?.name,
        };

        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);

        /*
        |--------------------------------------------------------------------------
        | Clear only the input after message is sent.
        |--------------------------------------------------------------------------
        */

        setInput("");

        try {
            localStorage.removeItem(CURRENT_INPUT_KEY);

            localStorage.setItem(
                CURRENT_MESSAGES_KEY,
                JSON.stringify(updatedMessages),
            );
        } catch (error) {
            console.error("Unable to persist ALIBATON AI user message.", error);
        }

        setIsLoading(true);

        const history = updatedMessages.slice(-12).map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: message.text,
        }));

        try {
            const formData = new FormData();

            /*
            |--------------------------------------------------------------------------
            | CORE AI QUESTION
            |--------------------------------------------------------------------------
            */

            formData.append("message", messageText);

            /*
            |--------------------------------------------------------------------------
            | CHAT HISTORY
            |--------------------------------------------------------------------------
            */

            formData.append("history", JSON.stringify(history));

            /*
            |--------------------------------------------------------------------------
            | CURRENT REPORT DATA
            |--------------------------------------------------------------------------
            */

            formData.append("reports", JSON.stringify(reportSummary));

            formData.append("report_summary", JSON.stringify(reportSummary));

            /*
            |--------------------------------------------------------------------------
            | PAGE CONTEXT
            |--------------------------------------------------------------------------
            */

            formData.append("page", "Reports & Analytics");

            /*
            |--------------------------------------------------------------------------
            | MODULE CONTEXT
            |--------------------------------------------------------------------------
            */

            formData.append(
                "module_context",
                JSON.stringify({
                    modules: [
                        "staff",
                        "clients",
                        "invoices",
                        "payments",
                        "documents",
                        "compliance",
                        "contracts",
                        "job_orders",
                        "reports",
                    ],
                    instruction:
                        "Answer questions using actual ALIBATON database records available to the authenticated user. Do not invent database values. If the requested records are unavailable, clearly state that no matching records were returned.",
                }),
            );

            if (selectedFile) {
                formData.append("file", selectedFile);
            }

            console.log("ALIBATON AI REQUEST:", messageText);

            console.log("ALIBATON AI ENDPOINT:", "/ai/alibaton/chat");

            const response = await fetch("/ai/alibaton/chat", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    // ✅ Fresh token: XSRF-TOKEN cookie (sine-set sa bawat response).
                    // Kapag walang cookie, fallback sa meta csrf-token.
                    ...(getXsrfCookieToken()
                        ? { "X-XSRF-TOKEN": getXsrfCookieToken() }
                        : { "X-CSRF-TOKEN": getCsrfToken() }),
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/json",
                },
                body: formData,
            });

            const rawResponse = await response.text();

            const contentType = response.headers.get("content-type") || "";

            console.log("ALIBATON AI HTTP STATUS:", response.status);

            console.log("ALIBATON AI CONTENT TYPE:", contentType);

            console.log("ALIBATON AI RAW RESPONSE:", rawResponse);

            let data: AIResponse | null = null;

            try {
                data = JSON.parse(rawResponse) as AIResponse;
            } catch (jsonError) {
                console.error("ALIBATON AI JSON PARSE ERROR:", jsonError);
            }

            /*
            |--------------------------------------------------------------------------
            | HTTP ERROR
            |--------------------------------------------------------------------------
            */

            if (!response.ok) {
                let errorMessage = `ALIBATON AI request failed (HTTP ${response.status}).`;

                if (data) {
                    errorMessage = data.message || data.error || errorMessage;
                } else if (rawResponse) {
                    errorMessage =
                        `ALIBATON AI request failed (HTTP ${response.status}).\n\n` +
                        rawResponse.slice(0, 1000);
                }

                throw new Error(errorMessage);
            }

            /*
            |--------------------------------------------------------------------------
            | INVALID RESPONSE
            |--------------------------------------------------------------------------
            */

            if (!data) {
                const preview = rawResponse
                    .replace(/<style[\s\S]*?<\/style>/gi, "")
                    .replace(/<script[\s\S]*?<\/script>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 1500);

                throw new Error(
                    "ALIBATON AI returned an invalid response.\n\n" +
                        `Content-Type: ${contentType || "unknown"}\n\n` +
                        `Server response:\n${preview || "Empty response"}`,
                );
            }

            /*
            |--------------------------------------------------------------------------
            | SERVER ERROR
            |--------------------------------------------------------------------------
            */

            if (data.error && !data.message && !data.answer) {
                throw new Error(data.error);
            }

            /*
            |--------------------------------------------------------------------------
            | AI MESSAGE
            |--------------------------------------------------------------------------
            */

            const aiMessage: Message = {
                id: Date.now() + 1,

                sender: "ai",

                text:
                    data.message ||
                    data.answer ||
                    "ALIBATON AI completed the request.",

                createdAt: new Date().toISOString(),

                visual: data.visual,

                visualData: data.visualData,

                records: data.records,

                report: data.report,

                reportName: data.reportName,

                reportUrl: data.reportUrl,

                reportPath: data.reportPath,

                reportMimeType: data.reportMimeType,

                reportType: data.reportType,

                reportGenerated: data.reportGenerated,
            };

            const finalMessages = [...updatedMessages, aiMessage];

            setMessages(finalMessages);

            /*
            |--------------------------------------------------------------------------
            | PERSIST COMPLETE AI RESPONSE
            |--------------------------------------------------------------------------
            */

            try {
                localStorage.setItem(
                    CURRENT_MESSAGES_KEY,
                    JSON.stringify(finalMessages),
                );
            } catch (error) {
                console.error("Unable to persist ALIBATON AI response.", error);
            }

            /*
            |--------------------------------------------------------------------------
            | EXPAND RETURNED MODULES
            |--------------------------------------------------------------------------
            */

            if (data.records) {
                const modules = Object.keys(data.records);

                const expanded: Record<string, boolean> = {};

                modules.forEach((module) => {
                    expanded[module] = true;
                });

                setExpandedModules(expanded);
            }

            /*
            |--------------------------------------------------------------------------
            | SAVE CHAT
            |--------------------------------------------------------------------------
            */

            saveCurrentChat(finalMessages);

            setSelectedFile(null);

            setFileError("");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("ALIBATON AI ERROR:", error);

            const errorText =
                error instanceof Error
                    ? error.message
                    : "Unable to complete the ALIBATON AI request.";

            const errorMessage: Message = {
                id: Date.now() + 2,

                sender: "ai",

                text: "I couldn't complete that request.\n\n" + errorText,

                createdAt: new Date().toISOString(),
            };

            setMessages((previous) => {
                const finalMessages = [...previous, errorMessage];

                try {
                    localStorage.setItem(
                        CURRENT_MESSAGES_KEY,
                        JSON.stringify(finalMessages),
                    );
                } catch (storageError) {
                    console.error(
                        "Unable to persist ALIBATON AI error message.",
                        storageError,
                    );
                }

                return finalMessages;
            });
        } finally {
            setIsLoading(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | ENTER
    |--------------------------------------------------------------------------
    */

    const handleInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            sendMessage();
        }
    };

    /*
    |--------------------------------------------------------------------------
    | QUICK QUESTIONS
    |--------------------------------------------------------------------------
    */

    const quickQuestions = [
        {
            title: "System Overview",
            icon: Database,
            question:
                "Give me a complete summary of the available ALIBATON database records. Include the total records per module, important statuses, and key financial information. Use actual database records only.",
        },
        {
            title: "Billing",
            icon: Receipt,
            question:
                "Analyze the actual ALIBATON billing and invoicing records. Give me the number of invoices, their statuses, total billed amount, outstanding amount, and identify overdue or pending billing records if available.",
        },
        {
            title: "Invoices",
            icon: Receipt,
            question:
                "Show and summarize the actual invoice records in ALIBATON. Include invoice number, client, amount, status, dates, and outstanding balance where available.",
        },
        {
            title: "Payments",
            icon: CreditCard,
            question:
                "Analyze the actual ALIBATON payment records. Show payment totals, payment statuses, pending or partial payments, and identify outstanding amounts using the database records.",
        },
        {
            title: "Contracts",
            icon: FileCheck2,
            question:
                "Analyze the actual ALIBATON contracts and permits. Show their current status, expiry dates, expiring-soon records, expired records, and renewal information where available.",
        },
        {
            title: "Documents",
            icon: FileText,
            question:
                "Analyze the actual ALIBATON document records. Show document types, client or company classification, status, expiry information, locked documents, and other important document information available to me.",
        },
        {
            title: "Compliance",
            icon: ShieldCheck,
            question:
                "Analyze the actual ALIBATON compliance records. Show compliant, non-compliant, under-review, pending, expiring, and expired records, including important due dates and expiry dates.",
        },
        {
            title: "Job Orders",
            icon: BriefcaseBusiness,
            question:
                "Analyze the actual ALIBATON job order records. Show the available job orders, clients, project information, statuses, dates, and other relevant job-order information.",
        },
        {
            title: "Staff",
            icon: Users,
            question:
                "Show the actual staff records available to my account. Give me the staff count and summarize the available staff information without inventing any data.",
        },
        {
            title: "Clients",
            icon: Users,
            question:
                "Show the actual client records available in ALIBATON. Give me the client count and summarize their available information using database records only.",
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | TOGGLE MODULE
    |--------------------------------------------------------------------------
    */

    const toggleModule = (module: string) => {
        setExpandedModules((previous) => ({
            ...previous,
            [module]: !previous[module],
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | RETURN
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="ALIBATON AI" />

            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-black/95 px-5 py-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/70"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black">
                        <Bot className="h-6 w-6" />
                    </span>

                    <span className="hidden text-left sm:block">
                        <span className="block text-sm font-black tracking-wide">
                            ALIBATON AI
                        </span>

                        <span className="block text-xs text-white/50">
                            Database Assistant
                        </span>
                    </span>
                </button>
            )}

            {open && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
                    <div className="flex h-full w-full flex-col overflow-hidden border border-yellow-400/20 bg-[#070707] shadow-2xl sm:mx-auto sm:my-4 sm:h-[calc(100vh-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-3xl lg:w-[calc(100%-3rem)] xl:max-w-[1500px]">
                        {/* HEADER */}

                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-4 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/10">
                                    <Bot className="h-6 w-6" />
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="truncate text-base font-black tracking-wide text-white sm:text-xl">
                                            ALIBATON AI
                                        </h1>

                                        <span className="hidden rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-[10px] font-bold text-green-400 sm:inline-flex">
                                            DATABASE CONNECTED
                                        </span>
                                    </div>

                                    <p className="text-xs text-white/45 sm:text-sm">
                                        Actual ALIBATON system records
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={createNewChat}
                                    title="New Chat"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowRecentChats((value) => !value)
                                    }
                                    title="Recent Chats"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400"
                                >
                                    <Clock3 className="h-5 w-5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    title="Close"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* RECENT CHATS */}

                        {showRecentChats && (
                            <div className="absolute right-4 top-20 z-50 w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl sm:right-8 sm:w-96">
                                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            Recent Chats
                                        </p>

                                        <p className="text-xs text-white/40">
                                            Your saved AI conversations
                                        </p>
                                    </div>

                                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {recentChats.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-sm text-white/40">
                                            No recent chats yet.
                                        </div>
                                    ) : (
                                        recentChats.map((chat) => (
                                            <button
                                                key={chat.id}
                                                type="button"
                                                onClick={() => loadChat(chat)}
                                                className="group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                                                    <MessageCircle className="h-4 w-4" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-white">
                                                        {chat.title}
                                                    </p>

                                                    <p className="text-[11px] text-white/35">
                                                        {formatDateTime(
                                                            chat.createdAt,
                                                        )}
                                                    </p>
                                                </div>

                                                <span
                                                    onClick={(event) =>
                                                        deleteChat(
                                                            event,
                                                            chat.id,
                                                        )
                                                    }
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/20 opacity-0 transition hover:bg-red-400/10 hover:text-red-400 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* MINI STATUS */}

                        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-white/10 bg-[#090909] p-3 sm:grid-cols-4 sm:px-6 lg:px-8">
                            <MiniStat
                                icon={<Database className="h-4 w-4" />}
                                label="Reports"
                                value={reports.length}
                            />

                            <MiniStat
                                icon={<FileBarChart className="h-4 w-4" />}
                                label="Generated"
                                value={
                                    messages.filter(
                                        (message) => message.reportGenerated,
                                    ).length
                                }
                            />

                            <MiniStat
                                icon={<MessageCircle className="h-4 w-4" />}
                                label="Messages"
                                value={messages.length}
                            />

                            <MiniStat
                                icon={<TrendingUp className="h-4 w-4" />}
                                label="Status"
                                value="LIVE"
                            />
                        </div>

                        {/* MESSAGES */}

                        <div
                            ref={messagesContainerRef}
                            className="min-h-0 flex-1 overflow-y-auto bg-[#050505] px-3 py-5 sm:px-6 lg:px-8"
                        >
                            <div className="mx-auto w-full max-w-7xl space-y-5">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={
                                            message.sender === "user"
                                                ? "flex justify-end"
                                                : "flex justify-start"
                                        }
                                    >
                                        <div
                                            className={
                                                message.sender === "user"
                                                    ? "w-auto max-w-[90%] sm:max-w-[70%]"
                                                    : "w-full max-w-full"
                                            }
                                        >
                                            {message.sender === "user" ? (
                                                <div className="rounded-2xl rounded-br-md border border-yellow-400/20 bg-yellow-400 px-4 py-3 text-sm font-medium leading-6 text-black shadow-lg shadow-yellow-400/5">
                                                    {message.text}
                                                </div>
                                            ) : (
                                                <div className="w-full rounded-2xl rounded-bl-md border border-white/10 bg-[#101010] p-4 shadow-xl sm:p-5 lg:p-6">
                                                    <div className="mb-4 flex items-center gap-2">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-black">
                                                            <Sparkles className="h-4 w-4" />
                                                        </div>

                                                        <div>
                                                            <p className="text-xs font-black tracking-wide text-white sm:text-sm">
                                                                ALIBATON AI
                                                            </p>

                                                            <p className="text-[10px] text-white/30">
                                                                {formatDateTime(
                                                                    message.createdAt,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="whitespace-pre-wrap text-sm leading-7 text-white/80 sm:text-[15px]">
                                                        {message.text}
                                                    </div>

                                                    {/* GENERATED REPORT */}

                                                    {message.reportGenerated &&
                                                        (message.reportUrl ||
                                                            message.report) && (
                                                            <div className="mt-5 overflow-hidden rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04]">
                                                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                                                                            <FileBarChart className="h-5 w-5" />
                                                                        </div>

                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-white">
                                                                                Report
                                                                                Generated
                                                                            </p>

                                                                            <p className="max-w-[300px] truncate text-xs text-white/40">
                                                                                {
                                                                                    message.reportName
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            downloadReport(
                                                                                message.reportUrl,
                                                                                message.report,
                                                                                message.reportName,
                                                                            )
                                                                        }
                                                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-yellow-300"
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                        Download
                                                                    </button>
                                                                </div>

                                                                {message.reportPath && (
                                                                    <div className="border-t border-yellow-400/10 px-4 py-2">
                                                                        <p className="truncate text-[10px] text-white/30">
                                                                            Saved:{" "}
                                                                            {
                                                                                message.reportPath
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* DATABASE */}

                                                    {message.records && (
                                                        <DatabaseSummary
                                                            records={
                                                                message.records
                                                            }
                                                            visualData={
                                                                message.visualData
                                                            }
                                                            report={
                                                                message.report
                                                            }
                                                            reportUrl={
                                                                message.reportUrl
                                                            }
                                                            reportName={
                                                                message.reportName
                                                            }
                                                            onDownload={() =>
                                                                downloadReport(
                                                                    message.reportUrl,
                                                                    message.report,
                                                                    message.reportName,
                                                                )
                                                            }
                                                            expandedModules={
                                                                expandedModules
                                                            }
                                                            onToggleModule={
                                                                toggleModule
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="w-full rounded-2xl border border-white/10 bg-[#101010] px-4 py-4 sm:px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-black">
                                                    <Bot className="h-4 w-4" />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />

                                                    <span className="text-sm text-white/50">
                                                        ALIBATON AI is analyzing
                                                        actual system records...
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QUICK QUESTIONS */}

                        <div className="shrink-0 border-t border-white/10 bg-[#090909]">
                            <div className="px-3 py-3 sm:px-6 lg:px-8">
                                <div className="mb-2 flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />

                                    <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                                        Ask ALIBATON AI
                                    </p>

                                    <span className="text-[10px] text-white/20">
                                        • Database modules
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <div className="flex min-w-max gap-2 pb-1">
                                        {quickQuestions.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <button
                                                    key={item.title}
                                                    type="button"
                                                    disabled={isLoading}
                                                    onClick={() =>
                                                        sendMessage(
                                                            item.question,
                                                        )
                                                    }
                                                    className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/60 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Icon className="h-3.5 w-3.5" />

                                                    {item.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* FILE */}

                            {selectedFile && (
                                <div className="px-3 pb-2 sm:px-6 lg:px-8">
                                    <div className="flex items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-3 py-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Paperclip className="h-4 w-4 shrink-0 text-yellow-400" />

                                            <span className="truncate text-xs text-white/70">
                                                {selectedFile.name}
                                            </span>

                                            <span className="shrink-0 text-[10px] text-white/30">
                                                {(
                                                    selectedFile.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={removeSelectedFile}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-red-400/10 hover:text-red-400"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* FILE ERROR */}

                            {fileError && (
                                <div className="px-3 pb-2 sm:px-6 lg:px-8">
                                    <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-400">
                                        <AlertCircle className="h-4 w-4 shrink-0" />

                                        <span>{fileError}</span>
                                    </div>
                                </div>
                            )}

                            {/* INPUT */}

                            <div className="px-3 pb-3 sm:px-6 sm:pb-5 lg:px-8">
                                <div className="mx-auto flex w-full max-w-7xl items-center gap-2 rounded-2xl border border-white/10 bg-black p-2 transition focus-within:border-yellow-400/30">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ALLOWED_EXTENSIONS.join(",")}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        title="Attach file"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/5 hover:text-yellow-400"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>

                                    <input
                                        ref={inputRef}
                                        value={input}
                                        onChange={(event) =>
                                            setInput(event.target.value)
                                        }
                                        onKeyDown={handleInputKeyDown}
                                        disabled={isLoading}
                                        placeholder="Ask ALIBATON AI about Billing, Payments, Contracts, Documents, Compliance, Job Orders, Clients, Staff..."
                                        className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/25 focus:ring-0 disabled:opacity-50"
                                    />

                                    <button
                                        type="button"
                                        disabled={isLoading || !input.trim()}
                                        onClick={() => sendMessage()}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                <p className="mx-auto mt-2 w-full max-w-7xl text-center text-[10px] text-white/20">
                                    ALIBATON AI uses records available to the
                                    authenticated system. It should not invent
                                    database information.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/*
|--------------------------------------------------------------------------
| DATABASE SUMMARY
|--------------------------------------------------------------------------
*/

type DatabaseSummaryProps = {
    records: AIRecords;
    visualData?: VisualData;

    report?: string;
    reportUrl?: string;
    reportName?: string;

    onDownload: () => void;

    expandedModules: Record<string, boolean>;

    onToggleModule: (module: string) => void;
};

function DatabaseSummary({
    records,
    visualData,
    report,
    reportUrl,
    reportName,
    onDownload,
    expandedModules,
    onToggleModule,
}: DatabaseSummaryProps) {
    const moduleDefinitions = [
        {
            key: "staff",
            title: "Staff",
            icon: Users,
        },
        {
            key: "clients",
            title: "Clients",
            icon: Users,
        },
        {
            key: "invoices",
            title: "Invoices",
            icon: Receipt,
        },
        {
            key: "payments",
            title: "Payments",
            icon: CreditCard,
        },
        {
            key: "contracts",
            title: "Contracts",
            icon: FileCheck2,
        },
        {
            key: "documents",
            title: "Documents",
            icon: FileText,
        },
        {
            key: "compliance",
            title: "Compliance",
            icon: ShieldCheck,
        },
        {
            key: "job_orders",
            title: "Job Orders",
            icon: BriefcaseBusiness,
        },
    ];

    const availableModules = moduleDefinitions.filter((module) =>
        Array.isArray(records[module.key as keyof AIRecords]),
    );

    const counts = visualData?.counts || {};

    const financial = visualData?.financial || {};

    const hasReport = Boolean(reportUrl || report);

    return (
        <div className="mt-5 w-full space-y-4">
            {/* SUMMARY */}

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black">
                            <Database className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-sm font-black text-white">
                                ALIBATON DATABASE SUMMARY
                            </p>

                            <p className="text-xs text-white/35">
                                Actual records returned from the system
                            </p>
                        </div>
                    </div>

                    {hasReport && (
                        <button
                            type="button"
                            onClick={onDownload}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-yellow-300"
                        >
                            <Download className="h-4 w-4" />
                            Download Database Report
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
                    <SummaryCard
                        label="Staff"
                        value={counts.staff ?? records.staff?.length ?? 0}
                        icon={<Users className="h-4 w-4" />}
                    />

                    <SummaryCard
                        label="Clients"
                        value={counts.clients ?? records.clients?.length ?? 0}
                        icon={<Users className="h-4 w-4" />}
                    />

                    <SummaryCard
                        label="Invoices"
                        value={counts.invoices ?? records.invoices?.length ?? 0}
                        icon={<Receipt className="h-4 w-4" />}
                    />

                    <SummaryCard
                        label="Payments"
                        value={counts.payments ?? records.payments?.length ?? 0}
                        icon={<CreditCard className="h-4 w-4" />}
                    />
                </div>
            </div>

            {/* FINANCIAL */}

            {Object.keys(financial).length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-yellow-400" />

                        <p className="text-sm font-bold text-white">
                            Financial Summary
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {Object.entries(financial).map(([key, value]) => (
                            <div
                                key={key}
                                className="rounded-xl border border-white/10 bg-black p-3"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                                    {humanizeKey(key)}
                                </p>

                                <p className="mt-1 text-lg font-black text-yellow-400">
                                    {key.toLowerCase().includes("amount") ||
                                    key.toLowerCase().includes("payment") ||
                                    key.toLowerCase().includes("total")
                                        ? formatMoney(value)
                                        : formatNumber(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODULES */}

            <div className="space-y-2">
                {availableModules.map((module) => {
                    const Icon = module.icon;

                    const moduleRecords =
                        records[module.key as keyof AIRecords] || [];

                    const isExpanded = Boolean(expandedModules[module.key]);

                    return (
                        <RecordModule
                            key={module.key}
                            moduleKey={module.key}
                            title={module.title}
                            icon={<Icon className="h-4 w-4" />}
                            records={moduleRecords as Record<string, any>[]}
                            expanded={isExpanded}
                            onToggle={() => onToggleModule(module.key)}
                        />
                    );
                })}
            </div>

            {availableModules.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black p-8 text-center">
                    <Database className="mx-auto h-8 w-8 text-white/20" />

                    <p className="mt-3 text-sm font-semibold text-white/50">
                        No database records were returned.
                    </p>
                </div>
            )}

            {hasReport && (
                <div className="flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-400/5 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />

                    <div className="min-w-0">
                        <p className="text-xs font-bold text-green-400">
                            Report file generated successfully
                        </p>

                        <p className="truncate text-[10px] text-white/30">
                            {reportName || "ALIBATON AI Report.csv"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| RECORD MODULE
|--------------------------------------------------------------------------
*/

type RecordModuleProps = {
    moduleKey: string;
    title: string;
    icon: React.ReactNode;
    records: Record<string, any>[];
    expanded: boolean;
    onToggle: () => void;
};

function RecordModule({
    moduleKey,
    title,
    icon,
    records,
    expanded,
    onToggle,
}: RecordModuleProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                        {icon}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{title}</p>

                        <p className="text-[11px] text-white/30">
                            {formatNumber(records.length)} record
                            {records.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>

                {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-white/30" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-white/10 p-3">
                    {records.length === 0 ? (
                        <div className="rounded-xl border border-white/5 bg-black p-5 text-center text-xs text-white/30">
                            No records found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                            {records.map((record, index) => (
                                <RecordCard
                                    key={`${moduleKey}-${index}`}
                                    record={record}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| RECORD CARD
|--------------------------------------------------------------------------
*/

function RecordCard({ record }: { record: Record<string, any> }) {
    const entries = Object.entries(record);

    return (
        <div className="rounded-xl border border-white/10 bg-black p-3 transition hover:border-yellow-400/20">
            <div className="space-y-2">
                {entries.map(([key, value]) => {
                    if (value === null || value === undefined || value === "") {
                        return null;
                    }

                    const lowerKey = key.toLowerCase();

                    const isMoney =
                        lowerKey.includes("amount") ||
                        lowerKey.includes("price") ||
                        lowerKey.includes("total") ||
                        lowerKey.includes("balance");

                    const isDate =
                        lowerKey.includes("date") ||
                        lowerKey.includes("created_at") ||
                        lowerKey.includes("updated_at") ||
                        lowerKey.includes("expires_at");

                    let displayValue: string;

                    if (typeof value === "object") {
                        try {
                            displayValue = JSON.stringify(value);
                        } catch {
                            displayValue = String(value);
                        }
                    } else if (typeof value === "boolean") {
                        displayValue = value ? "Yes" : "No";
                    } else if (isMoney) {
                        displayValue = formatMoney(value);
                    } else if (isDate) {
                        displayValue = formatDateTime(String(value));
                    } else {
                        displayValue = String(value);
                    }

                    return (
                        <div
                            key={key}
                            className="flex gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                            <div className="w-[38%] shrink-0">
                                <p className="break-words text-[10px] font-bold uppercase tracking-wide text-white/25">
                                    {humanizeKey(key)}
                                </p>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="break-words text-xs text-white/70">
                                    {displayValue}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SUMMARY CARD
|--------------------------------------------------------------------------
*/

function SummaryCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: unknown;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-[#0b0b0b] p-4">
            <div className="mb-2 flex items-center gap-2 text-white/30">
                {icon}

                <span className="text-[10px] font-bold uppercase tracking-wider">
                    {label}
                </span>
            </div>

            <p className="text-xl font-black text-white">
                {formatNumber(value)}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MINI STAT
|--------------------------------------------------------------------------
*/

function MiniStat({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="text-yellow-400">{icon}</div>

            <div className="min-w-0">
                <p className="truncate text-[9px] font-bold uppercase tracking-wider text-white/25">
                    {label}
                </p>

                <p className="truncate text-xs font-black text-white">
                    {typeof value === "number" ? formatNumber(value) : value}
                </p>
            </div>
        </div>
    );
}
