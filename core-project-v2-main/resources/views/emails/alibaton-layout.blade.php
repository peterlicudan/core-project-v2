<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>{{ $title ?? 'ALIBATON' }}</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#09090b;
        font-family:Arial, Helvetica, sans-serif;
        color:#18181b;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#09090b; padding:40px 15px;"
>
    <tr>
        <td align="center">

            <!-- Main Container -->
            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:620px;
                    background:#ffffff;
                    border-radius:18px;
                    overflow:hidden;
                "
            >

                <!-- Header -->
                <tr>
                    <td
                        style="
                            background:#111111;
                            padding:28px 35px;
                            text-align:center;
                            border-bottom:4px solid #facc15;
                        "
                    >

                        <div
                            style="
                                font-size:28px;
                                font-weight:900;
                                letter-spacing:3px;
                                color:#facc15;
                            "
                        >
                            ALIBATON
                        </div>

                        <div
                            style="
                                margin-top:7px;
                                color:#d4d4d8;
                                font-size:12px;
                                letter-spacing:1px;
                            "
                        >
                            HEAVY EQUIPMENT & LOGISTICS
                        </div>

                    </td>
                </tr>


                <!-- Content -->
                <tr>
                    <td
                        style="
                            padding:40px 35px;
                        "
                    >

                        @yield('content')

                    </td>
                </tr>


                <!-- Footer -->
                <tr>
                    <td
                        style="
                            background:#18181b;
                            padding:25px 30px;
                            text-align:center;
                        "
                    >

                        <div
                            style="
                                color:#facc15;
                                font-size:16px;
                                font-weight:bold;
                                margin-bottom:8px;
                            "
                        >
                            ALIBATON
                        </div>

                        <div
                            style="
                                color:#a1a1aa;
                                font-size:12px;
                                line-height:20px;
                            "
                        >
                            Heavy Equipment & Logistics Management
                        </div>

                        <div
                            style="
                                color:#71717a;
                                font-size:11px;
                                margin-top:12px;
                            "
                        >
                            Power • Precision • Reliability
                        </div>

                        <div
                            style="
                                color:#52525b;
                                font-size:10px;
                                margin-top:15px;
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
