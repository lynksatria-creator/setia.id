import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path


ENV_FILE = Path("/opt/auroramedia-api/api.env")
SERVER_KEY_PATTERN = re.compile(r"[A-Za-z0-9._-]+")
CONFIG_KEY_PATTERN = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")


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
        raise SystemExit("Could not determine the API service account for the Midtrans environment file.")

    username = user_result.stdout.strip() or "root"
    try:
        account = pwd.getpwnam(username)
        group_name = group_result.stdout.strip()
        group_id = grp.getgrnam(group_name).gr_gid if group_name else account.pw_gid
    except KeyError:
        raise SystemExit("Could not resolve the API service account for the Midtrans environment file.") from None
    return account.pw_uid, group_id


def update_env_contents(contents, server_key, is_sandbox):
    if not SERVER_KEY_PATTERN.fullmatch(server_key):
        raise ValueError("Midtrans Server Key contains unsupported characters.")
    if is_sandbox not in {"true", "false"}:
        raise ValueError("Midtrans environment must be true or false.")

    values = {
        "MIDTRANS_SERVER_KEY": server_key,
        "MIDTRANS_IS_SANDBOX": is_sandbox,
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


def write_env_file(path, server_key, is_sandbox, owner=None):
    path = Path(path)
    if not path.parent.is_dir():
        raise SystemExit("API environment directory does not exist.")
    if path.is_symlink():
        raise SystemExit("Refusing to replace a symlinked API environment file.")

    try:
        contents = path.read_text(encoding="utf-8") if path.exists() else ""
        updated = update_env_contents(contents, server_key, is_sandbox)
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None

    descriptor, temporary_path = tempfile.mkstemp(prefix=".midtrans-", dir=path.parent)
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
    if len(fields) != 2:
        raise SystemExit("Expected the Midtrans key and environment through standard input.")
    try:
        server_key, is_sandbox = (field.decode("utf-8") for field in fields)
        server_key = server_key.strip()
        is_sandbox = is_sandbox.strip()
    except UnicodeDecodeError:
        raise SystemExit("Midtrans configuration must be valid UTF-8.") from None
    if not server_key:
        raise SystemExit("Midtrans Server Key cannot be empty.")

    write_env_file(ENV_FILE, server_key, is_sandbox, api_service_owner())
    print("Midtrans configuration was updated on the API server.")


if __name__ == "__main__":
    main()
