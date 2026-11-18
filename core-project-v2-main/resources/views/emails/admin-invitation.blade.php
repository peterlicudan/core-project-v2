<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALIBATON Admin Invitation</title>
</head>

<body style="margin:0;padding:0;background:#050810;font-family:Arial,Helvetica,sans-serif;color:#E2E8F0;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
       style="background:#050810;padding:40px 20px;">

    <tr>
        <td align="center">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                   style="max-width:560px;background:#0A0F1D;border:1px solid #1E293B;border-radius:16px;overflow:hidden;">

                <!-- HEADER -->
                <tr>
                    <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #1E293B;">

                        <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:900;letter-spacing:-0.5px;">
                            ALI<span style="color:#F59E0B;">BATON</span>
                        </h1>

                        <p style="margin:6px 0 0;color:#94A3B8;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                            Heavy Equipment &amp; Logistics
                        </p>

                    </td>
                </tr>

                <!-- BODY -->
                <tr>
                    <td style="padding:32px;">

                        <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:20px;font-weight:700;">
                            You're Invited, {{ $admin->name }}!
                        </h2>

                        <p style="margin:0 0 16px;color:#CBD5E1;font-size:14px;line-height:1.7;">

                            <strong style="color:#F59E0B;">
                                {{ $invitedByName }}
                            </strong>

                            has invited you to become an

                            <strong style="color:#FFFFFF;">
                                Administrator
                            </strong>

                            of the ALIBATON platform.

                        </p>

                        <p style="margin:0 0 24px;color:#CBD5E1;font-size:14px;line-height:1.7;">
                            Click the button below to set up your password and activate your admin account. You'll be automatically logged in after setup.
                        </p>

                        <!-- ✅ SINGLE CTA — ACCEPT INVITATION -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                               style="margin:28px auto;">

                            <tr>
                                <td align="center"
                                    style="background-color:#F59E0B;border-radius:12px;">

                                    <a href="{{ $invitationUrl }}"
                                       style="display:inline-block;padding:16px 36px;color:#0A0F1D;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;letter-spacing:0.3px;">

                                        ACCEPT INVITATION &rarr;

                                    </a>

                                </td>
                            </tr>

                        </table>

                        <!-- FALLBACK LINK -->
                        <p style="margin:24px 0 8px;color:#94A3B8;font-size:12px;">
                            Or copy this link to your browser:
                        </p>

                        <div style="background:#050810;border:1px solid #1E293B;border-radius:8px;padding:12px;margin-bottom:24px;">

                            <a href="{{ $invitationUrl }}"
                               style="color:#F59E0B;font-size:11px;text-decoration:none;word-break:break-all;font-family:'Courier New',monospace;">

                                {{ $invitationUrl }}

                            </a>

                        </div>

                        <!-- EXPIRATION -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                               style="background:#1C170B;border:1px solid #6B4B13;border-radius:12px;margin-top:24px;">

                            <tr>
                                <td style="padding:16px;">

                                    <p style="margin:0;color:#F59E0B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                                        Important
                                    </p>

                                    <p style="margin:6px 0 0;color:#CBD5E1;font-size:13px;line-height:1.6;">

                                        This invitation link expires on

                                        <strong style="color:#FFFFFF;">
                                            {{ $expiresAt->format('F d, Y \a\t h:i A') }}
                                        </strong>.

                                        The link can only be used once.

                                    </p>

                                </td>
                            </tr>

                        </table>

                        <!-- SECURITY NOTICE -->
                        <p style="margin:24px 0 0;color:#94A3B8;font-size:12px;line-height:1.7;">

                            If you didn't expect this invitation, you can safely ignore this email.
                            Do not share your invitation link with anyone.

                        </p>

                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td style="padding:20px 32px;background:#070B16;border-top:1px solid #1E293B;text-align:center;">

                        <p style="margin:0;color:#64748B;font-size:11px;">
                            &copy; {{ date('Y') }}
                            <strong style="color:#94A3B8;">ALIBATON</strong>
                            — All Rights Reserved
                        </p>

                        <p style="margin:6px 0 0;color:#475569;font-size:10px;">
                            This is an automated message. Please do not reply.
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>

</table>

</body>
</html>