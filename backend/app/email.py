"""Transactional email via Resend. Without RESEND_API_KEY, emails are logged instead (local dev)."""
import logging

import httpx

from app.config import settings

log = logging.getLogger("myflashcard.email")


def send_email(to: str, subject: str, text: str) -> None:
    if not settings.resend_api_key:
        log.warning("Email (not sent — no RESEND_API_KEY)\nTo: %s\nSubject: %s\n\n%s", to, subject, text)
        return
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "text": text},
            timeout=10,
        )
        r.raise_for_status()
    except httpx.HTTPError as exc:
        # Don't fail the request (e.g. registration) because email is down; the user can resend.
        log.error("Could not send email to %s: %s", to, exc)


def send_verification(to: str, alias: str, token: str) -> None:
    link = f"{settings.app_url.rstrip('/')}/account/verify?token={token}"
    send_email(
        to,
        "Confirm your myFlashCard email",
        f"Hi {alias},\n\nConfirm your email to start generating decks with AI:\n{link}\n\n"
        "This link is valid for 48 hours. If you didn't create an account, ignore this email.",
    )


def send_password_reset(to: str, alias: str, token: str) -> None:
    link = f"{settings.app_url.rstrip('/')}/account/reset?token={token}"
    send_email(
        to,
        "Reset your myFlashCard password",
        f"Hi {alias},\n\nReset your password here:\n{link}\n\n"
        "This link is valid for 1 hour. If you didn't ask for this, you can ignore this email.",
    )
