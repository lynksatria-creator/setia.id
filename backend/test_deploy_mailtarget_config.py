import os

import pytest

from backend.deploy_mailtarget_config import update_env_contents, write_env_file


def test_update_env_contents_preserves_other_settings_and_updates_mailtarget():
    contents = "MONGO_URL=mongodb://localhost:27018\nMAILTARGET_API_KEY=\nKEEP=value\n"

    updated = update_env_contents(contents, "mailtarget-key", "hello@example.com", "Nuansa Invite")

    assert updated == (
        "MONGO_URL=mongodb://localhost:27018\n"
        "MAILTARGET_API_KEY='mailtarget-key'\n"
        "KEEP=value\n"
        "MAILTARGET_FROM_EMAIL='hello@example.com'\n"
        "MAILTARGET_FROM_NAME='Nuansa Invite'\n"
    )


def test_update_env_contents_removes_duplicate_mailtarget_entries():
    contents = (
        "MAILTARGET_API_KEY=old\n"
        "MAILTARGET_API_KEY=duplicate\n"
        "MAILTARGET_FROM_EMAIL=old@example.com\n"
        "MAILTARGET_FROM_EMAIL=duplicate@example.com\n"
    )

    updated = update_env_contents(contents, "new-key", "hello@example.com", "")

    assert updated.count("MAILTARGET_API_KEY=") == 1
    assert updated.count("MAILTARGET_FROM_EMAIL=") == 1
    assert updated.count("MAILTARGET_FROM_NAME=") == 1
    assert "MAILTARGET_API_KEY='new-key'" in updated
    assert "MAILTARGET_FROM_EMAIL='hello@example.com'" in updated
    assert "MAILTARGET_FROM_NAME='Nuansa Invite'" in updated


@pytest.mark.parametrize(
    ("api_key", "sender", "sender_name"),
    [
        ("", "hello@example.com", "Nuansa Invite"),
        ("key\nMAILTARGET_FROM_EMAIL=attacker@example.com", "hello@example.com", "Nuansa Invite"),
        ("valid-key", "not-an-email", "Nuansa Invite"),
        ("valid-key", "hello@example.com", "name\nMAILTARGET_API_KEY=attacker"),
    ],
)
def test_update_env_contents_rejects_invalid_mailtarget_values(api_key, sender, sender_name):
    with pytest.raises(ValueError):
        update_env_contents("", api_key, sender, sender_name)


def test_write_env_file_creates_private_file_and_keeps_secret_out_of_output(tmp_path):
    env_file = tmp_path / ".env"

    write_env_file(env_file, "mailtarget-key", "hello@example.com", "Nuansa Invite")

    assert env_file.read_text(encoding="utf-8") == (
        "MAILTARGET_API_KEY='mailtarget-key'\n"
        "MAILTARGET_FROM_EMAIL='hello@example.com'\n"
        "MAILTARGET_FROM_NAME='Nuansa Invite'\n"
    )
    if os.name == "posix":
        assert env_file.stat().st_mode & 0o777 == 0o600
