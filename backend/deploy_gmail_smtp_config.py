import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path


ENV_FILE = Path("/opt/auroramedia-api/app/.env")
CONFIG_KEY_PATTERN = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")
LEGACY_CONFIG_KEYS = {
    "MAILTARGET_API_KEY",
    "MAILTARGET_FROM_EMAIL",
    "MAILTARGET_FROM_NAME",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
}


def api_service_owner():
    import grp
    import pwd

    user_result = subprocess.run(
        ["systemctl", "show", "auroramedia-api.service", "--property=User", "--value"],
        capture_output=True,
        text=True,
        check=False,
    )
    group_result = subprocess.run(
        ["systemctl", "show", "auroramedia-api.service", "--property=Group", "--value"],
        capture_output=True,
        text=True,
        check=False,
    )
    if user_result.returncode != 0 or group_result.returncode != 0:
        raise SystemExit("Could not determine the API service account for the Gmail SMTP environment file.")

    username = user_result.stdout.strip() or "root"
    try:
        account = pwd.getpwnam(username)
        group_name = group_result.stdout.strip()
        group_id = grp.getgrnam(group_name).gr_gid if group_name else account.pw_gid
    except KeyError:
        raise SystemExit("Could not resolve the API service account for the Gmail SMTP environment file.") from None
    return account.pw_uid, group_id


def dotenv_value(value):
    if any(character in value for character in ("\0", "\r", "\n")):
        raise ValueError("Gmail SMTP settings cannot contain line breaks or null characters.")
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def update_env_contents(contents, app_password):
    if not app_password or app_password != app_password.strip():
        raise ValueError("Gmail SMTP App Password cannot be empty or have surrounding whitespace.")
    if any(character.isspace() and character != " " for character in app_password):
        raise ValueError("Gmail SMTP App Password can contain spaces but not other whitespace.")

    app_password = app_password.replace(" ", "")
    if len(app_password) > 256:
        raise ValueError("Gmail SMTP App Password is too long.")

    values = {"GMAIL_SMTP_APP_PASSWORD": dotenv_value(app_password)}
    found = set()
    updated = []
    for line in contents.splitlines():
        match = CONFIG_KEY_PATTERN.match(line)
        key = match.group(1) if match else None
        if key in LEGACY_CONFIG_KEYS:
            continue
        if key not in values:
            updated.append(line)
        elif key not in found:
            updated.append(f"{key}={values[key]}")
            found.add(key)

    for key, value in values.items():
        if key not in found:
            updated.append(f"{key}={value}")

    return "\n".join(updated) + "\n"


def write_env_file(path, app_password, owner=None):
    path = Path(path)
    if not path.parent.is_dir():
        raise SystemExit("API environment directory does not exist.")
    if path.is_symlink():
        raise SystemExit("Refusing to replace a symlinked API environment file.")

    try:
        contents = path.read_text(encoding="utf-8") if path.exists() else ""
        updated = update_env_contents(contents, app_password)
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None

    descriptor, temporary_path = tempfile.mkstemp(prefix=".gmail-smtp-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as temporary_file:
            temporary_file.write(updated)
        if owner is not None:
            os.chown(temporary_path, *owner)
        os.chmod(temporary_path, stat.S_IRUSR | stat.S_IWUSR)
        os.replace(temporary_path, path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def main():
    try:
        app_password = sys.stdin.buffer.read().decode("utf-8")
    except UnicodeDecodeError:
        raise SystemExit("Gmail SMTP configuration must be valid UTF-8.") from None

    write_env_file(ENV_FILE, app_password, api_service_owner())
    print("Gmail SMTP configuration was updated on the API server.")


if __name__ == "__main__":
    main()
