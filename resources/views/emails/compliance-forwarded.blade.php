<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>{{ $subjectText }}</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#020617;
        font-family:Arial,Helvetica,sans-serif;
        color:#e2e8f0;
    "
>
    <div
        style="
            width:100%;
            padding:40px 15px;
            box-sizing:border-box;
            background:#020617;
        "
    >
        <div
            style="
                max-width:620px;
                margin:0 auto;
                background:#0f172a;
                border:1px solid #334155;
                border-radius:14px;
                overflow:hidden;
            "
        >

            {{-- HEADER --}}
            <div
                style="
                    padding:24px;
                    background:#020617;
                    border-bottom:1px solid #334155;
                "
            >
                <div
                    style="
                        font-size:24px;
                        font-weight:900;
                        letter-spacing:1px;
                        color:#facc15;
                    "
                >
                    ALIBATON
                </div>

                <div
                    style="
                        margin-top:5px;
                        font-size:12px;
                        color:#64748b;
                    "
                >
                    Heavy Equipment &amp; Logistics Management System
                </div>
            </div>

            {{-- BODY --}}
            <div style="padding:30px 24px;">

                <h1
                    style="
                        margin:0 0 18px;
                        font-size:21px;
                        line-height:1.4;
                        color:#ffffff;
                    "
                >
                    Compliance Document
                </h1>

                <div
                    style="
                        white-space:pre-line;
                        font-size:14px;
                        line-height:1.8;
                        color:#cbd5e1;
                    "
                >
                    {{ $messageText }}
                </div>

                {{-- COMPLIANCE INFORMATION --}}
                <div
                    style="
                        margin-top:25px;
                        padding:18px;
                        background:#020617;
                        border:1px solid #1e293b;
                        border-radius:10px;
                    "
                >
                    <div
                        style="
                            margin-bottom:12px;
                            font-size:10px;
                            font-weight:800;
                            text-transform:uppercase;
                            letter-spacing:1px;
                            color:#facc15;
                        "
                    >
                        Compliance Information
                    </div>

                    <div
                        style="
                            margin-bottom:8px;
                            font-size:13px;
                        "
                    >
                        <strong style="color:#94a3b8;">
                            Title:
                        </strong>

                        <span style="color:#ffffff;">
                            {{ $compliance->title }}
                        </span>
                    </div>

                    <div
                        style="
                            margin-bottom:8px;
                            font-size:13px;
                        "
                    >
                        <strong style="color:#94a3b8;">
                            Type:
                        </strong>

                        <span style="color:#ffffff;">
                            {{ $compliance->type }}
                        </span>
                    </div>

                    <div
                        style="
                            margin-bottom:8px;
                            font-size:13px;
                        "
                    >
                        <strong style="color:#94a3b8;">
                            Status:
                        </strong>

                        <span style="color:#ffffff;">
                            {{ $compliance->status }}
                        </span>
                    </div>

                    @if($compliance->due_date)
                        <div
                            style="
                                margin-bottom:8px;
                                font-size:13px;
                            "
                        >
                            <strong style="color:#94a3b8;">
                                Due Date:
                            </strong>

                            <span style="color:#ffffff;">
                                {{ $compliance->due_date->format('F d, Y') }}
                            </span>
                        </div>
                    @endif

                    @if($compliance->expiry_date)
                        <div
                            style="
                                font-size:13px;
                            "
                        >
                            <strong style="color:#94a3b8;">
                                Expiry Date:
                            </strong>

                            <span style="color:#ffffff;">
                                {{ $compliance->expiry_date->format('F d, Y') }}
                            </span>
                        </div>
                    @endif
                </div>

                {{-- ATTACHMENT --}}
                <div
                    style="
                        margin-top:20px;
                        padding:14px 16px;
                        background:#111827;
                        border:1px solid rgba(250,204,21,.2);
                        border-radius:10px;
                        font-size:13px;
                        color:#94a3b8;
                    "
                >
                    📎 Attached file:

                    <strong style="color:#ffffff;">
                        {{ $compliance->file_name ?: 'Compliance Document' }}
                    </strong>
                </div>

                {{-- FOOTER --}}
                <div
                    style="
                        margin-top:30px;
                        padding-top:20px;
                        border-top:1px solid #1e293b;
                        font-size:13px;
                        line-height:1.7;
                        color:#64748b;
                    "
                >
                    Regards,<br>

                    <strong style="color:#facc15;">
                        ALIBATON Team
                    </strong>
                </div>

            </div>
        </div>
    </div>
</body>
</html>