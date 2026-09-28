<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>ALIBATON Email Verification</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        width:100%;
        background-color:#000000;
        font-family:Arial, Helvetica, sans-serif;
        color:#ffffff;
    "
>

<!-- OUTER BACKGROUND -->

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width:100%;
        background-color:#000000;
        margin:0;
        padding:40px 15px;
    "
>

    <tr>

        <td align="center">

            <!-- MAIN EMAIL CARD -->

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    width:100%;
                    max-width:640px;
                    background-color:#0b0b0b;
                    border:1px solid #292929;
                    border-radius:18px;
                    overflow:hidden;
                "
            >

                <!-- TOP YELLOW LINE -->

                <tr>

                    <td
                        style="
                            height:5px;
                            background-color:#facc15;
                            font-size:0;
                            line-height:0;
                        "
                    >
                        &nbsp;
                    </td>

                </tr>


                <!-- HEADER -->

                <tr>

                    <td
                        align="center"
                        style="
                            background-color:#080808;
                            padding:38px 25px 30px;
                            border-bottom:1px solid #222222;
                        "
                    >

                        <!-- ALIBATON -->

                        <div
                            style="
                                color:#facc15;
                                font-size:30px;
                                font-weight:800;
                                letter-spacing:5px;
                                line-height:1.2;
                            "
                        >
                            ALIBATON
                        </div>


                        <!-- COMPANY NAME -->

                        <div
                            style="
                                margin-top:10px;
                                color:#ffffff;
                                font-size:11px;
                                font-weight:600;
                                letter-spacing:2px;
                                text-transform:uppercase;
                            "
                        >
                            HEAVY EQUIPMENT &amp; LOGISTICS
                        </div>

                    </td>

                </tr>


                <!-- MAIN CONTENT -->

                <tr>

                    <td
                        style="
                            padding:40px 35px;
                            background-color:#0b0b0b;
                        "
                    >

                        <!-- TITLE -->

                        <h1
                            style="
                                margin:0 0 12px;
                                padding:0;
                                color:#ffffff;
                                font-size:28px;
                                font-weight:700;
                                line-height:1.3;
                            "
                        >
                            Welcome to ALIBATON!
                        </h1>


                        <!-- GREETING -->

                        <p
                            style="
                                margin:0 0 18px;
                                color:#ffffff;
                                font-size:15px;
                                line-height:1.7;
                            "
                        >
                            Hello
                            <strong style="color:#ffffff;">
                                {{ $user->name }}
                            </strong>,
                        </p>


                        <!-- DESCRIPTION -->

                        <p
                            style="
                                margin:0 0 10px;
                                color:#dddddd;
                                font-size:15px;
                                line-height:1.8;
                            "
                        >
                            Your
                            <strong style="color:#ffffff;">
                                ALIBATON Heavy Equipment &amp; Logistics
                            </strong>
                            account has been created successfully.
                        </p>


                        <p
                            style="
                                margin:0;
                                color:#dddddd;
                                font-size:15px;
                                line-height:1.8;
                            "
                        >
                            Use the verification PIN below to verify
                            your email address and activate your account.
                        </p>


                        <!-- PIN SECTION -->

                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                width:100%;
                                margin:30px 0 25px;
                            "
                        >

                            <tr>

                                <td
                                    align="center"
                                    style="
                                        background-color:#151515;
                                        border:1px solid #383838;
                                        border-radius:16px;
                                        padding:28px 20px;
                                    "
                                >

                                    <!-- PIN LABEL -->

                                    <div
                                        style="
                                            color:#ffffff;
                                            font-size:12px;
                                            font-weight:600;
                                            letter-spacing:2px;
                                            text-transform:uppercase;
                                            margin-bottom:15px;
                                        "
                                    >
                                        Your Verification PIN
                                    </div>


                                    <!-- PIN -->

                                    <div
                                        style="
                                            display:inline-block;
                                            background-color:#facc15;
                                            color:#000000;
                                            font-size:38px;
                                            font-weight:800;
                                            letter-spacing:8px;
                                            line-height:1;
                                            padding:18px 24px 18px 30px;
                                            border-radius:12px;
                                        "
                                    >
                                        {{ $pin }}
                                    </div>


                                    <!-- EXPIRATION -->

                                    <div
                                        style="
                                            margin-top:16px;
                                            color:#cccccc;
                                            font-size:13px;
                                            line-height:1.6;
                                        "
                                    >
                                        This PIN expires in
                                        <strong style="color:#facc15;">
                                            10 minutes
                                        </strong>.
                                    </div>

                                </td>

                            </tr>

                        </table>


                        <!-- SECURITY NOTICE -->

                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                width:100%;
                                margin:0 0 25px;
                            "
                        >

                            <tr>

                                <td
                                    style="
                                        background-color:#121212;
                                        border-left:4px solid #facc15;
                                        padding:17px 18px;
                                    "
                                >

                                    <div
                                        style="
                                            margin-bottom:6px;
                                            color:#facc15;
                                            font-size:13px;
                                            font-weight:700;
                                            text-transform:uppercase;
                                            letter-spacing:1px;
                                        "
                                    >
                                        Security Notice
                                    </div>


                                    <div
                                        style="
                                            color:#dddddd;
                                            font-size:13px;
                                            line-height:1.7;
                                        "
                                    >
                                        Never share this verification PIN
                                        with anyone. ALIBATON will never
                                        ask you to disclose your PIN.
                                    </div>

                                </td>

                            </tr>

                        </table>


                        <!-- UNKNOWN ACCOUNT MESSAGE -->

                        <p
                            style="
                                margin:0;
                                color:#aaaaaa;
                                font-size:13px;
                                line-height:1.8;
                            "
                        >
                            If you did not expect this account,
                            you can safely ignore this email.
                        </p>

                    </td>

                </tr>


                <!-- FOOTER -->

                <tr>

                    <td
                        align="center"
                        style="
                            background-color:#080808;
                            border-top:1px solid #222222;
                            padding:28px 25px;
                        "
                    >

                        <!-- TAGLINE -->

                        <div
                            style="
                                color:#facc15;
                                font-size:13px;
                                font-weight:700;
                                letter-spacing:2px;
                            "
                        >
                            POWER • PRECISION • RELIABILITY
                        </div>


                        <!-- COPYRIGHT -->

                        <div
                            style="
                                margin-top:12px;
                                color:#ffffff;
                                font-size:11px;
                                line-height:1.6;
                            "
                        >
                            © {{ date('Y') }}
                            ALIBATON Heavy Equipment &amp; Logistics.
                            All rights reserved.
                        </div>


                        <!-- SYSTEM NAME -->

                        <div
                            style="
                                margin-top:7px;
                                color:#777777;
                                font-size:10px;
                                line-height:1.5;
                            "
                        >
                            Heavy Equipment &amp; Logistics
                            Management System
                        </div>

                    </td>

                </tr>

            </table>

        </td>

    </tr>

</table>

</body>

</html>

