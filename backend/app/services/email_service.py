import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return str(random.randint(100000, 999999))

def send_otp_email(to_email: str, otp: str, purpose: str = "login") -> bool:
    """
    Send OTP email via Gmail SMTP.
    Returns True on success, False on failure.
    """
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        # Dev mode — print OTP to console instead
        print(f"\n{'='*40}")
        print(f"OTP for {to_email}: {otp}")
        print(f"{'='*40}\n")
        return True

    subject = f"GATEPrep — Your OTP for {purpose}"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
        <div style="max-width: 400px; margin: auto; background: white; border-radius: 12px; padding: 30px;">
            <h2 style="color: #0ea5e9; margin-bottom: 8px;">GATEPrep</h2>
            <p style="color: #334155;">Your one-time password for <strong>{purpose}</strong>:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;
                        background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                {otp}
            </div>
            <p style="color: #64748b; font-size: 13px;">
                This OTP expires in {settings.OTP_EXPIRE_MINUTES} minutes.<br>
                Do not share it with anyone.
            </p>
        </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False
