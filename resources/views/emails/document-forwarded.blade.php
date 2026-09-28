<!DOCTYPE html>
<html>
<head>
    <title>{{ $subject ?? 'Document Forwarded' }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid #facc15;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #1e293b;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            color: #64748b;
            margin: 5px 0 0;
        }
        .content {
            color: #334155;
            line-height: 1.6;
        }
        .content h2 {
            color: #1e293b;
            font-size: 20px;
        }
        .message-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #facc15;
        }
        .doc-info {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .doc-info p {
            margin: 5px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 12px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ALIBATON</h1>
            <p>Heavy Equipment & Logistics</p>
        </div>

        <div class="content">
            <h2>Document Forwarded</h2>

            <div class="doc-info">
                <p><strong>📄 Document:</strong> {{ $document->title }}</p>
                <p><strong>📎 File:</strong> {{ $fileName ?? $document->file_name }}</p>
                <p><strong>📅 Uploaded:</strong> {{ $document->created_at?->format('F d, Y') ?? 'N/A' }}</p>
                <p><strong>📂 Type:</strong> {{ $document->type ?? 'Document' }}</p>
            </div>

            <div class="message-box">
                <p style="margin: 0; white-space: pre-line; color: #1e293b;">{{ $messageText }}</p>
            </div>

            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
                This document is attached to this email. Please review and take the necessary action.
            </p>

            <p style="margin-top: 30px; color: #64748b;">
                If you have any questions, please contact us at
                <a href="mailto:support@alibaton.com" style="color: #facc15;">support@alibaton.com</a>
            </p>

            <p style="margin-top: 30px;">
                Thank you,<br>
                <strong>ALIBATON Team</strong>
            </p>
        </div>

        <div class="footer">
            <p>This email contains confidential information. If you are not the intended recipient, please delete this email.</p>
            <p>&copy; {{ date('Y') }} ALIBATON Heavy Equipment & Logistics. All rights reserved.</p>
        </div>
    </div>
</body>
</html>