import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path


ENV_FILE = Path("/opt/auroramedia-api/app/.env")
CONFIG_KEY_PATTERN = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")
SENDER_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
        raise SystemExit("Could not determine the API service account for the Mailtarget environment file.")

    username = user_result.stdout.strip() or "root"
    try:
        account = pwd.getpwnam(username)
        group_name = group_result.stdout.strip()
        group_id = grp.getgrnam(group_name).gr_gid if group_name else account.pw_gid
    except KeyError:
        raise SystemExit("Could not resolve the API service account for the Mailtarget environment file.") from None
    return account.pw_uid, group_id


def dotenv_value(value):
    if any(character in value for character in ("\0", "\r", "\n")):
        raise ValueError("Mailtarget settings cannot contain line breaks or null characters.")
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def update_env_contents(contents, api_key, sender, sender_name):
    if not api_key or api_key != api_key.strip():
        raise ValueError("Mailtarget API key cannot be empty or have surrounding whitespace.")
    if len(api_key) > 4096:
        raise ValueError("Mailtarget API key is too long.")
    if not SENDER_PATTERN.fullmatch(sender) or len(sender) > 254:
        raise ValueError("Mailtarget sender must be a valid email address.")
    sender_name = sender_name.strip() or "Nuansa Invite"
    if len(sender_name) > 128:
        raise ValueError("Mailtarget sender name is too long.")

    values = {
        "MAILTARGET_API_KEY": dotenv_value(api_key),
        "MAILTARGET_FROM_EMAIL": dotenv_value(sender),
        "MAILTARGET_FROM_NAME": dotenv_value(sender_name),
    }
    found = set()
    updated = []
    for line in contents.splitlines():
        match = CONFIG_KEY_PATTERN.match(line)
        key = match.group(1) if match else None
        if key not in values:
            updated.append(line)
        elif key not in found:
            updated.append(f"{key}={values[key]}")
            found.add(key)

    for key, value in values.items():
        if key not in found:
            updated.append(f"{key}={value}")

    return "\n".join(updated) + "\n"


def write_env_file(path, api_key, sender, sender_name, owner=None):
    path = Path(path)
    if not path.parent.is_dir():
        raise SystemExit("API environment directory does not exist.")
    if path.is_symlink():
        raise SystemExit("Refusing to replace a symlinked API environment file.")

    try:
        contents = path.read_text(encoding="utf-8") if path.exists() else ""
        updated = update_env_contents(contents, api_key, sender, sender_name)
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None

    descriptor, temporary_path = tempfile.mkstemp(prefix=".mailtarget-", dir=path.parent)
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
    fields = sys.stdin.buffer.read().split(b"\0")
    if len(fields) != 3:
        raise SystemExit("Expected the Mailtarget API key, sender email, and sender name through standard input.")
    try:
        api_key, sender, sender_name = (field.decode("utf-8") for field in fields)
    except UnicodeDecodeError:
        raise SystemExit("Mailtarget configuration must be valid UTF-8.") from None

    write_env_file(ENV_FILE, api_key, sender, sender_name, api_service_owner())
    print("Mailtarget configuration was updated on the API server.")


if __name__ == "__main__":
    main()
