<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>ALIBATON Staff Account</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#0a0a0a;
        font-family:Arial, Helvetica, sans-serif;
        color:#ffffff;
    "
>
    <div
        style="
            max-width:620px;
            margin:40px auto;
            background:#111111;
            border:1px solid #2a2a2a;
            border-radius:16px;
            overflow:hidden;
        "
    >

        <!-- HEADER -->
        <div
            style="
                padding:28px;
                background:#000000;
                border-bottom:1px solid #2a2a2a;
            "
        >
            <h1
                style="
                    margin:0;
                    color:#facc15;
                    font-size:28px;
                    letter-spacing:1px;
                "
            >
                ALIBATON
            </h1>

            <p
                style="
                    margin:8px 0 0;
                    color:#a3a3a3;
                    font-size:14px;
                "
            >
                Heavy Equipment &amp; Logistics
            </p>
        </div>

        <!-- CONTENT -->
        <div style="padding:32px;">

            <h2
                style="
                    margin-top:0;
                    color:#ffffff;
                    font-size:22px;
                "
            >
                Welcome to ALIBATON
            </h2>

            <p
                style="
                    color:#d4d4d4;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Hello {{ $user->name }},
            </p>

            <p
                style="
                    color:#d4d4d4;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Your ALIBATON staff account has been successfully
                created by an administrator.
            </p>

            <!-- ACCOUNT DETAILS -->
            <div
                style="
                    margin:24px 0;
                    padding:20px;
                    background:#1a1a1a;
                    border:1px solid #333333;
                    border-radius:12px;
                "
            >
                <h3
                    style="
                        margin-top:0;
                        color:#facc15;
                        font-size:16px;
                    "
                >
                    Account Information
                </h3>

                <p
                    style="
                        margin:10px 0;
                        color:#d4d4d4;
                    "
                >
                    <strong>Name:</strong>
                    {{ $user->name }}
                </p>

                <p
                    style="
                        margin:10px 0;
                        color:#d4d4d4;
                    "
                >
                    <strong>Email:</strong>
                    {{ $user->email }}
                </p>

                <p
                    style="
                        margin:10px 0;
                        color:#d4d4d4;
                    "
                >
                    <strong>Role:</strong>
                    Staff
                </p>

                <p
                    style="
                        margin:10px 0;
                        color:#d4d4d4;
                    "
                >
                    <strong>Temporary Password:</strong>
                    {{ $temporaryPassword }}
                </p>
            </div>

            <!-- LOGIN BUTTON -->
            <div style="text-align:center; margin:30px 0;">

                <a
                    href="{{ $loginUrl }}"
                    style="
                        display:inline-block;
                        padding:14px 28px;
                        background:#facc15;
                        color:#000000;
                        text-decoration:none;
                        font-weight:bold;
                        border-radius:10px;
                    "
                >
                    Login to ALIBATON
                </a>

            </div>

            <p
                style="
                    color:#a3a3a3;
                    font-size:13px;
                    line-height:1.7;
                "
            >
                For security, do not share your account credentials
                with anyone. Please change your password after
                successfully logging in.
            </p>

            <p
                style="
                    color:#737373;
                    font-size:12px;
                    line-height:1.6;
                    margin-top:28px;
                "
            >
                If you did not expect this account, please contact
                your ALIBATON administrator.
            </p>

        </div>

        <!-- FOOTER -->
        <div
            style="
                padding:20px 32px;
                background:#080808;
                border-top:1px solid #2a2a2a;
            "
        >
            <p
                style="
                    margin:0;
                    color:#666666;
                    font-size:12px;
                    text-align:center;
                "
            >
                © {{ date('Y') }} ALIBATON Heavy Equipment &amp; Logistics
            </p>
        </div>

    </div>
</body>
</html>
