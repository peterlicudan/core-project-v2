<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ALIBATON Contract
    </title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#020617;
        font-family:Arial, Helvetica, sans-serif;
        color:#e2e8f0;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        background:#020617;
        padding:40px 15px;
    "
>
    <tr>
        <td align="center">

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:680px;
                    background:#0f172a;
                    border:1px solid #334155;
                    border-radius:18px;
                    overflow:hidden;
                "
            >

                {{-- HEADER --}}
                <tr>
                    <td
                        style="
                            padding:28px;
                            border-bottom:3px solid #facc15;
                        "
                    >

                        <div
                            style="
                                font-size:28px;
                                font-weight:900;
                                color:#ffffff;
                                letter-spacing:1px;
                            "
                        >
                            ALIBATON
                        </div>

                        <div
                            style="
                                margin-top:5px;
                                font-size:11px;
                                color:#94a3b8;
                                letter-spacing:2px;
                            "
                        >
                            HEAVY EQUIPMENT &amp; LOGISTICS
                        </div>

                    </td>
                </tr>

                {{-- BODY --}}
                <tr>
                    <td style="padding:30px;">

                        <h1
                            style="
                                margin:0;
                                font-size:22px;
                                color:#ffffff;
                            "
                        >
                            Contract / Permit Document
                        </h1>

                        <p
                            style="
                                margin-top:12px;
                                margin-bottom:0;
                                color:#94a3b8;
                                font-size:14px;
                                line-height:1.7;
                            "
                        >
                            Dear
                            {{ $contract->client ?: 'Client' }},
                        </p>

                        <p
                            style="
                                margin-top:18px;
                                color:#cbd5e1;
                                font-size:14px;
                                line-height:1.8;
                            "
                        >
                            ALIBATON Heavy Equipment &amp; Logistics
                            is sending you the contract / permit
                            information below for your reference.
                        </p>

                        {{-- CONTRACT NUMBER --}}
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                margin-top:24px;
                                background:#020617;
                                border:1px solid #334155;
                                border-radius:14px;
                            "
                        >
                            <tr>
                                <td style="padding:20px;">

                                    <div
                                        style="
                                            font-size:10px;
                                            font-weight:bold;
                                            color:#64748b;
                                            text-transform:uppercase;
                                            letter-spacing:1px;
                                        "
                                    >
                                        Contract Number
                                    </div>

                                    <div
                                        style="
                                            margin-top:7px;
                                            font-size:18px;
                                            font-weight:900;
                                            color:#facc15;
                                        "
                                    >
                                        {{ $contract->contract_no }}
                                    </div>

                                </td>
                            </tr>
                        </table>

                        {{-- DETAILS --}}
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="margin-top:18px;"
                        >

                            <tr>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 8px 10px 0;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Client
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->client ?: '—' }}
                                    </div>
                                </td>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 0 10px 8px;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Project
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->project ?: '—' }}
                                    </div>
                                </td>

                            </tr>

                            <tr>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 8px 10px 0;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Invoice
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->invoice ?: '—' }}
                                    </div>
                                </td>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 0 10px 8px;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Type
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->type ?: 'Contract' }}
                                    </div>
                                </td>

                            </tr>

                            <tr>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 8px 10px 0;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Start Date
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->start_date?->format('M d, Y') ?? '—' }}
                                    </div>
                                </td>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 0 10px 8px;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        End Date
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->end_date?->format('M d, Y') ?? '—' }}
                                    </div>
                                </td>

                            </tr>

                            <tr>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 8px 10px 0;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Location
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->location ?: '—' }}
                                    </div>
                                </td>

                                <td
                                    width="50%"
                                    valign="top"
                                    style="padding:10px 0 10px 8px;"
                                >
                                    <div
                                        style="
                                            font-size:10px;
                                            color:#64748b;
                                            text-transform:uppercase;
                                        "
                                    >
                                        Equipment
                                    </div>

                                    <div
                                        style="
                                            margin-top:5px;
                                            font-size:14px;
                                            font-weight:bold;
                                            color:#e2e8f0;
                                        "
                                    >
                                        {{ $contract->equipment ?: '—' }}
                                    </div>
                                </td>

                            </tr>

                        </table>

                        {{-- DESCRIPTION --}}
                        <div
                            style="
                                margin-top:22px;
                                padding:18px;
                                background:#020617;
                                border:1px solid #334155;
                                border-radius:14px;
                            "
                        >

                            <div
                                style="
                                    font-size:10px;
                                    font-weight:bold;
                                    color:#64748b;
                                    text-transform:uppercase;
                                    letter-spacing:1px;
                                "
                            >
                                Description
                            </div>

                            <div
                                style="
                                    margin-top:9px;
                                    color:#cbd5e1;
                                    font-size:13px;
                                    line-height:1.8;
                                "
                            >
                                {{
                                    $contract->description
                                    ?: 'Heavy equipment and logistics services under the agreed project terms.'
                                }}
                            </div>

                        </div>

                        {{-- FOOTER MESSAGE --}}
                        <p
                            style="
                                margin-top:28px;
                                color:#94a3b8;
                                font-size:13px;
                                line-height:1.7;
                            "
                        >
                            If you have any questions regarding this
                            contract or permit, please contact ALIBATON
                            Heavy Equipment &amp; Logistics.
                        </p>

                    </td>
                </tr>

                {{-- FOOTER --}}
                <tr>
                    <td
                        style="
                            padding:22px 30px;
                            border-top:1px solid #334155;
                            text-align:center;
                        "
                    >

                        <div
                            style="
                                font-size:10px;
                                color:#64748b;
                            "
                        >
                            ALIBATON Heavy Equipment &amp; Logistics
                            Management System
                        </div>

                        <div
                            style="
                                margin-top:5px;
                                font-size:9px;
                                color:#475569;
                            "
                        >
                            This email was sent from the ALIBATON
                            Contract &amp; Permit Management System.
                        </div>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
