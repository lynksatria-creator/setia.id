import os

import pytest

from backend.deploy_gmail_smtp_config import update_env_contents, write_env_file


def test_update_env_contents_preserves_other_settings_and_removes_mailtarget():
    contents = (
        "MONGO_URL=mongodb://localhost:27018\n"
        "MAILTARGET_API_KEY=old-key\n"
        "MAILTARGET_FROM_EMAIL=old@example.com\n"
        "SMTP_FROM_EMAIL=old@example.com\n"
        "KEEP=value\n"
    )

    updated = update_env_contents(contents, "abcd efgh ijkl mnop")

    assert updated == (
        "MONGO_URL=mongodb://localhost:27018\n"
        "KEEP=value\n"
        "GMAIL_SMTP_APP_PASSWORD='abcdefghijklmnop'\n"
    )


def test_update_env_contents_removes_duplicate_gmail_password_entries():
    contents = (
        "GMAIL_SMTP_APP_PASSWORD=old\n"
        "GMAIL_SMTP_APP_PASSWORD=duplicate\n"
    )

    updated = update_env_contents(contents, "new-app-password")

    assert updated.count("GMAIL_SMTP_APP_PASSWORD=") == 1
    assert "GMAIL_SMTP_APP_PASSWORD='new-app-password'" in updated


@pytest.mark.parametrize(
    "app_password",
    [
        "",
        " leading-space",
        "trailing-space ",
        "password\nMAILTARGET_API_KEY=injected",
        "password\twith-tab",
        "a" * 257,
    ],
)
def test_update_env_contents_rejects_invalid_app_password(app_password):
    with pytest.raises(ValueError):
        update_env_contents("", app_password)


def test_write_env_file_creates_private_file(tmp_path):
    env_file = tmp_path / ".env"

    write_env_file(env_file, "abcd efgh ijkl mnop")

    assert env_file.read_text(encoding="utf-8") == "GMAIL_SMTP_APP_PASSWORD='abcdefghijklmnop'\n"
    if os.name == "posix":
        assert env_file.stat().st_mode & 0o777 == 0o600
