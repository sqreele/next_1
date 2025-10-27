import base64
import logging
import os
from email.mime.text import MIMEText
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    # Lazy import to avoid hard dependency if not configured yet
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    _GOOGLE_LIBS_AVAILABLE = True
except Exception:
    _GOOGLE_LIBS_AVAILABLE = False


def _build_gmail_service():
    if not _GOOGLE_LIBS_AVAILABLE:
        logger.warning("Google API libraries not available; cannot use Gmail API")
        return None

    client_id = os.getenv('GMAIL_CLIENT_ID')
    client_secret = os.getenv('GMAIL_CLIENT_SECRET')
    refresh_token = os.getenv('GMAIL_REFRESH_TOKEN')

    if not (client_id and client_secret and refresh_token):
        logger.warning("Gmail API environment variables missing; falling back to SMTP")
        return None

    creds = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_id,
        client_secret=client_secret,
        scopes=['https://www.googleapis.com/auth/gmail.send'],
    )

    try:
        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logger.error(f"Failed to build Gmail service: {e}")
        return None


def send_email(to_email: str, subject: str, body: str, from_email: Optional[str] = None) -> bool:
    """Send an email either via Gmail API (preferred) or SMTP fallback.

    Returns True on success, False otherwise.
    """
    # Try Gmail API first
    service = _build_gmail_service()
    from_addr = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None) or 'no-reply@pmcs.site'

    if service is not None:
        try:
            message = MIMEText(body)
            message['to'] = to_email
            message['from'] = from_addr
            message['subject'] = subject

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            service.users().messages().send(userId='me', body={'raw': raw}).execute()
            logger.info(f"Email sent via Gmail API to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Gmail API send failed: {e}")
            # Continue to try SMTP fallback

    # SMTP fallback using Django's send_mail
    try:
        from django.core.mail import send_mail
        sent = send_mail(subject, body, from_addr, [to_email], fail_silently=False)
        if sent:
            logger.info(f"Email sent via SMTP to {to_email}")
            return True
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")

    return False