
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>ALIBATON Contract</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#090909;
        font-family:Arial, Helvetica, sans-serif;
        color:#ffffff;
    "
>

    <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="background:#090909; padding:40px 15px;"
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
                        background:#111111;
                        border:1px solid #292929;
                        border-radius:18px;
                        overflow:hidden;
                    "
                >

                    {{-- HEADER --}}
                    <tr>
                        <td
                            style="
                                padding:32px 35px;
                                background:#0d0d0d;
                                border-bottom:1px solid #292929;
                            "
                        >

                            <div
                                style="
                                    font-size:26px;
                                    font-weight:800;
                                    letter-spacing:2px;
                                    color:#facc15;
                                "
                            >
                                ALIBATON
                            </div>

                            <div
                                style="
                                    margin-top:7px;
                                    font-size:12px;
                                    color:#8f8f8f;
                                    letter-spacing:1.5px;
                                    text-transform:uppercase;
                                "
                            >
                                Power • Precision • Reliability
                            </div>

                        </td>
                    </tr>


                    {{-- CONTENT --}}
                    <tr>
                        <td
                            style="
                                padding:35px;
                            "
                        >

                            <h1
                                style="
                                    margin:0 0 15px 0;
                                    font-size:25px;
                                    line-height:1.3;
                                    color:#ffffff;
                                "
                            >
                                Contract / Permit Document
                            </h1>


                            <p
                                style="
                                    margin:0 0 25px 0;
                                    font-size:15px;
                                    line-height:1.7;
                                    color:#c7c7c7;
                                "
                            >
                                Hello,
                            </p>


                            <p
                                style="
                                    margin:0 0 25px 0;
                                    font-size:15px;
                                    line-height:1.7;
                                    color:#c7c7c7;
                                "
                            >
                                An ALIBATON contract or permit record has been
                                sent to you for your reference.
                            </p>


                            {{-- CONTRACT INFORMATION --}}
                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                style="
                                    margin:25px 0;
                                    background:#181818;
                                    border:1px solid #303030;
                                    border-radius:14px;
                                "
                            >

                                <tr>
                                    <td
                                        style="
                                            padding:18px 20px;
                                            border-bottom:1px solid #2b2b2b;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size:11px;
                                                color:#777777;
                                                text-transform:uppercase;
                                                letter-spacing:1px;
                                            "
                                        >
                                            Contract Number
                                        </div>

                                        <div
                                            style="
                                                margin-top:6px;
                                                font-size:16px;
                                                font-weight:700;
                                                color:#facc15;
                                            "
                                        >
                                            {{ $contractNumber }}
                                        </div>
                                    </td>
                                </tr>


                                <tr>
                                    <td
                                        style="
                                            padding:18px 20px;
                                            border-bottom:1px solid #2b2b2b;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size:11px;
                                                color:#777777;
                                                text-transform:uppercase;
                                                letter-spacing:1px;
                                            "
                                        >
                                            Client
                                        </div>

                                        <div
                                            style="
                                                margin-top:6px;
                                                font-size:15px;
                                                color:#ffffff;
                                            "
                                        >
                                            {{ $client }}
                                        </div>
                                    </td>
                                </tr>


                                <tr>
                                    <td
                                        style="
                                            padding:18px 20px;
                                            border-bottom:1px solid #2b2b2b;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size:11px;
                                                color:#777777;
                                                text-transform:uppercase;
                                                letter-spacing:1px;
                                            "
                                        >
                                            Project
                                        </div>

                                        <div
                                            style="
                                                margin-top:6px;
                                                font-size:15px;
                                                color:#ffffff;
                                            "
                                        >
                                            {{ $project }}
                                        </div>
                                    </td>
                                </tr>


                                <tr>
                                    <td
                                        style="
                                            padding:18px 20px;
                                        "
                                    >
                                        <div
                                            style="
                                                font-size:11px;
                                                color:#777777;
                                                text-transform:uppercase;
                                                letter-spacing:1px;
                                            "
                                        >
                                            Type
                                        </div>

                                        <div
                                            style="
                                                margin-top:6px;
                                                font-size:15px;
                                                color:#ffffff;
                                            "
                                        >
                                            {{ $type }}
                                        </div>
                                    </td>
                                </tr>

                            </table>


                            {{-- DESCRIPTION --}}
                            <div
                                style="
                                    margin-top:25px;
                                    padding:20px;
                                    background:#151515;
                                    border-left:3px solid #facc15;
                                    border-radius:8px;
                                "
                            >

                                <div
                                    style="
                                        margin-bottom:8px;
                                        font-size:11px;
                                        font-weight:700;
                                        color:#facc15;
                                        text-transform:uppercase;
                                        letter-spacing:1px;
                                    "
                                >
                                    Description
                                </div>

                                <div
                                    style="
                                        font-size:14px;
                                        line-height:1.7;
                                        color:#bdbdbd;
                                    "
                                >
                                    {{ $description }}
                                </div>

                            </div>


                            <p
                                style="
                                    margin:30px 0 0 0;
                                    font-size:14px;
                                    line-height:1.7;
                                    color:#a8a8a8;
                                "
                            >
                                Please review the contract or permit details
                                carefully. If you have any questions or require
                                clarification, please contact the appropriate
                                ALIBATON representative.
                            </p>


                            <p
                                style="
                                    margin:25px 0 0 0;
                                    font-size:14px;
                                    line-height:1.7;
                                    color:#a8a8a8;
                                "
                            >
                                Thank you for working with ALIBATON.
                            </p>

                        </td>
                    </tr>


                    {{-- FOOTER --}}
                    <tr>
                        <td
                            style="
                                padding:25px 35px;
                                background:#0d0d0d;
                                border-top:1px solid #292929;
                            "
                        >

                            <div
                                style="
                                    font-size:12px;
                                    line-height:1.6;
                                    color:#666666;
                                "
                            >
                                This email was sent from the ALIBATON
                                Contract & Permit Management System.
                            </div>

                            <div
                                style="
                                    margin-top:10px;
                                    font-size:11px;
                                    color:#4f4f4f;
                                "
                            >
                                © {{ date('Y') }} ALIBATON. All rights reserved.
                            </div>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>

    </table>

</body>
</html>

