<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>{{ $emailSubject }}</title>
</head>

<body
    style="
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        background-color: #f3f4f6;
        padding: 30px 15px;
    "
>
    <tr>
        <td align="center">

            <table
                width="600"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    width: 100%;
                    max-width: 600px;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                "
            >

                {{-- HEADER --}}
                <tr>
                    <td
                        style="
                            background-color: #111111;
                            padding: 25px 30px;
                            text-align: center;
                        "
                    >
                        <h1
                            style="
                                margin: 0;
                                color: #facc15;
                                font-size: 24px;
                                font-weight: 700;
                            "
                        >
                            ALIBATON
                        </h1>

                        <p
                            style="
                                margin: 6px 0 0;
                                color: #ffffff;
                                font-size: 13px;
                            "
                        >
                            Heavy Equipment &amp; Logistics
                        </p>
                    </td>
                </tr>

                {{-- BODY --}}
                <tr>
                    <td style="padding: 30px;">

                        <h2
                            style="
                                margin: 0 0 15px;
                                font-size: 21px;
                                color: #111827;
                            "
                        >
                            Payment Status Update
                        </h2>

                        <p
                            style="
                                margin: 0 0 20px;
                                line-height: 1.7;
                                color: #4b5563;
                            "
                        >
                            {{ $emailMessage }}
                        </p>

                        {{-- PAYMENT DETAILS --}}
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                border: 1px solid #e5e7eb;
                                border-radius: 8px;
                                overflow: hidden;
                            "
                        >

                            {{-- TITLE --}}
                            <tr>
                                <td
                                    colspan="2"
                                    style="
                                        padding: 14px 16px;
                                        background-color: #f9fafb;
                                        font-weight: 700;
                                        color: #111827;
                                    "
                                >
                                    Payment Details
                                </td>
                            </tr>

                            {{-- PAYMENT ID --}}
                            <tr>
                                <td
                                    style="
                                        width: 40%;
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        color: #6b7280;
                                    "
                                >
                                    Payment ID
                                </td>

                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        font-weight: 600;
                                    "
                                >
                                    #{{ $payment->id }}
                                </td>
                            </tr>

                            {{-- AMOUNT --}}
                            <tr>
                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        color: #6b7280;
                                    "
                                >
                                    Amount
                                </td>

                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        font-weight: 700;
                                    "
                                >
                                    ₱{{ number_format((float) $payment->amount, 2) }}
                                </td>
                            </tr>

                            {{-- STATUS --}}
                            <tr>
                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        color: #6b7280;
                                    "
                                >
                                    Status
                                </td>

                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        font-weight: 700;
                                    "
                                >
                                    {{ ucfirst($payment->status ?? 'Pending') }}
                                </td>
                            </tr>

                            {{-- DATE --}}
                            <tr>
                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                        color: #6b7280;
                                    "
                                >
                                    Updated
                                </td>

                                <td
                                    style="
                                        padding: 12px 16px;
                                        border-top: 1px solid #e5e7eb;
                                    "
                                >
                                    {{ optional($payment->updated_at)->format('F d, Y h:i A') }}
                                </td>
                            </tr>

                        </table>

                        {{-- MESSAGE --}}
                        <p
                            style="
                                margin: 25px 0 0;
                                line-height: 1.7;
                                color: #6b7280;
                                font-size: 14px;
                            "
                        >
                            Please keep this email for your records.

                            If you have questions regarding this payment,
                            please contact ALIBATON Heavy Equipment &amp; Logistics.
                        </p>

                    </td>
                </tr>

                {{-- FOOTER --}}
                <tr>
                    <td
                        style="
                            padding: 20px 30px;
                            background-color: #111111;
                            text-align: center;
                        "
                    >

                        <p
                            style="
                                margin: 0;
                                color: #d1d5db;
                                font-size: 12px;
                            "
                        >
                            This is an automated message from ALIBATON.
                        </p>

                        <p
                            style="
                                margin: 6px 0 0;
                                color: #facc15;
                                font-size: 12px;
                                font-weight: 600;
                            "
                        >
                            Power • Precision • Reliability
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
