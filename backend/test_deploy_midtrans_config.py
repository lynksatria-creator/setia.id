import os

import pytest

from backend.deploy_midtrans_config import update_env_contents, write_env_file


def test_update_env_contents_preserves_other_settings_and_updates_midtrans():
    contents = "MONGO_URL=mongodb://localhost:27018\nMIDTRANS_SERVER_KEY=\nKEEP=value\n"

    updated = update_env_contents(contents, "SB-Mid-server-example", "true")

    assert updated == (
        "MONGO_URL=mongodb://localhost:27018\n"
        "MIDTRANS_SERVER_KEY=SB-Mid-server-example\n"
        "KEEP=value\n"
        "MIDTRANS_IS_SANDBOX=true\n"
    )


def test_update_env_contents_removes_duplicate_midtrans_entries():
    contents = (
        "MIDTRANS_SERVER_KEY=old\n"
        "MIDTRANS_SERVER_KEY=duplicate\n"
        "MIDTRANS_IS_SANDBOX=false\n"
        "MIDTRANS_IS_SANDBOX=true\n"
    )

    updated = update_env_contents(contents, "SB-Mid-server-new", "false")

    assert updated.count("MIDTRANS_SERVER_KEY=") == 1
    assert updated.count("MIDTRANS_IS_SANDBOX=") == 1
    assert "MIDTRANS_SERVER_KEY=SB-Mid-server-new" in updated
    assert "MIDTRANS_IS_SANDBOX=false" in updated


@pytest.mark.parametrize(
    ("server_key", "is_sandbox"),
    [
        ("SB-Mid-server-ok", "yes"),
        ("key with spaces", "true"),
        ("key\nMIDTRANS_IS_SANDBOX=false", "true"),
    ],
)
def test_update_env_contents_rejects_invalid_values(server_key, is_sandbox):
    with pytest.raises(ValueError):
        update_env_contents("", server_key, is_sandbox)


def test_write_env_file_creates_private_file_and_keeps_secret_out_of_output(tmp_path):
    env_file = tmp_path / ".env"

    write_env_file(env_file, "SB-Mid-server-example", "true")

    assert env_file.read_text(encoding="utf-8") == (
        "MIDTRANS_SERVER_KEY=SB-Mid-server-example\n"
        "MIDTRANS_IS_SANDBOX=true\n"
    )
    if os.name == "posix":
        assert env_file.stat().st_mode & 0o777 == 0o600
