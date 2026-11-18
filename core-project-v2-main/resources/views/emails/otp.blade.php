<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALIBATON Login Verification</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
            padding: 40px 20px;
        }

        .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #111111;
            border: 1px solid rgba(250, 204, 21, 0.15);
            border-radius: 20px;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, rgba(250, 204, 21, 0.08) 0%, rgba(250, 204, 21, 0.02) 100%);
            border-bottom: 1px solid rgba(250, 204, 21, 0.1);
            padding: 32px 32px 24px;
            text-align: center;
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }

        .brand-icon {
            width: 44px;
            height: 44px;
            background-color: rgba(250, 204, 21, 0.1);
            border: 1px solid rgba(250, 204, 21, 0.3);
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
        }

        .brand-name {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.2em;
            color: #FACC15;
        }

        .brand-subtitle {
            font-size: 10px;
            letter-spacing: 0.3em;
            color: #6b7280;
            text-transform: uppercase;
            margin-top: 4px;
        }

        .body { padding: 32px; }

        .greeting {
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }

        .message {
            font-size: 14px;
            color: #9ca3af;
            margin-bottom: 28px;
            line-height: 1.7;
        }

        .otp-label {
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.15em;
            color: #6b7280;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 12px;
        }

        .otp-code {
            background-color: rgba(250, 204, 21, 0.05);
            border: 2px dashed rgba(250, 204, 21, 0.3);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            margin-bottom: 24px;
        }

        .otp-digits {
            font-family: 'Courier New', Courier, monospace;
            font-size: 42px;
            font-weight: 900;
            letter-spacing: 0.4em;
            color: #FACC15;
            text-shadow: 0 0 20px rgba(250, 204, 21, 0.3);
        }

        .info-box {
            background-color: rgba(255, 255, 255, 0.02);
            border-left: 3px solid rgba(250, 204, 21, 0.5);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 12px;
        }

        .info-label { color: #6b7280; font-weight: 600; }
        .info-value { color: #ffffff; font-weight: 700; }

        .warning {
            background-color: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .warning-title {
            font-size: 12px;
            font-weight: 900;
            color: #ef4444;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
        }

        .warning-text {
            font-size: 12px;
            color: #9ca3af;
            line-height: 1.6;
        }

        .footer {
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 24px 32px;
            text-align: center;
        }

        .footer-text {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.7;
        }

        .footer-brand { color: #6b7280; font-weight: 700; }

        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.2), transparent);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">
                <div class="brand-icon">🛡️</div>
                <div>
                    <div class="brand-name">ALIBATON</div>
                    <div class="brand-subtitle">Administrator Access</div>
                </div>
            </div>
        </div>

        <div class="body">
            <div class="greeting">Hello, {{ $userName }}!</div>
            <p class="message">
                We received a login attempt to your ALIBATON Administrator account.
                Use the verification code below to complete your sign-in.
            </p>

            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">
                <div class="otp-digits">{{ $otp }}</div>
            </div>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Valid for</span>
                    <span class="info-value">{{ $expiryMinutes }} minutes</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Max attempts</span>
                    <span class="info-value">3 tries</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Requested at</span>
                    <span class="info-value">{{ now()->format('M d, Y - h:i A') }}</span>
                </div>
            </div>

            <div class="warning">
                <div class="warning-title">⚠️ Security Notice</div>
                <div class="warning-text">
                    If you did not attempt to login, please ignore this email and
                    consider changing your password immediately. Never share this
                    code with anyone — ALIBATON staff will never ask for it.
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="divider"></div>
            <p class="footer-text">
                This is an automated message from the<br>
                <span class="footer-brand">ALIBATON</span> Heavy Equipment & Logistics Management System.
            </p>
            <p class="footer-text" style="margin-top: 12px; font-size: 10px;">
                © {{ date('Y') }} ALIBATON. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>

