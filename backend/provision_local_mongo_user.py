import re
import shlex
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from pymongo import MongoClient
from pymongo.errors import OperationFailure, PyMongoError


UNIT = "auroramedia-api.service"
APP_ENV_FILE = Path("/opt/auroramedia-api/app/.env")


def systemd_property(name):
    result = subprocess.run(
        ["systemctl", "show", UNIT, f"--property={name}", "--value"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def read_env_file(path):
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError:
        return {}

    values = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, value = line.partition("=")
        if not separator:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values


def service_environment():
    values = {}
    environment_files = systemd_property("EnvironmentFiles")
    paths = re.findall(r"([^\s]+) \(ignore_errors=(?:yes|no)\)", environment_files)
    for path in paths:
        values.update(read_env_file(path.lstrip("-")))

    for key, value in read_env_file(APP_ENV_FILE).items():
        values.setdefault(key, value)

    environment = systemd_property("Environment")
    if environment and environment != "-":
        for item in shlex.split(environment):
            key, separator, value = item.partition("=")
            if separator:
                values[key] = value

    return values


def local_credentials(uri, db_name, mongo_port):
    try:
        parsed = urlsplit(uri)
        port = parsed.port or 27017
    except ValueError:
        return None

    if parsed.scheme != "mongodb" or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        return None
    if port != mongo_port or "," in parsed.netloc.rsplit("@", 1)[-1]:
        return None
    if not parsed.username or parsed.password is None:
        return None

    options = parse_qs(parsed.query)
    mechanism = options.get("authMechanism", [""])[0].upper()
    if mechanism not in {"", "SCRAM-SHA-1", "SCRAM-SHA-256"}:
        return None

    auth_source = options.get("authSource", [None])[0]
    if auth_source is None:
        auth_source = parsed.path.lstrip("/") or "admin"
    if auth_source == "$external":
        return None

    return {
        "username": unquote(parsed.username),
        "password": unquote(parsed.password),
        "auth_source": auth_source,
        "database": db_name,
    }


def is_authentication_failure(error):
    return isinstance(error, OperationFailure) and error.code == 18


def safe_error_name(error):
    code = getattr(error, "code", None)
    code_text = f", code={code}" if isinstance(code, int) else ""
    return f"{type(error).__name__}{code_text}"


def provision_application_user(uri, db_name, mongo_port, client_factory=MongoClient):
    credentials = local_credentials(uri, db_name, mongo_port)
    if credentials is None:
        return "Skipped local MongoDB user initialization; URI has no supported local SCRAM credentials."

    app_client = client_factory(uri, serverSelectionTimeoutMS=5000)
    try:
        app_client[db_name].list_collection_names()
        return "MongoDB application credentials verified."
    except PyMongoError as error:
        if not is_authentication_failure(error):
            raise SystemExit(f"MongoDB application connection failed ({safe_error_name(error)}).") from None
    finally:
        app_client.close()

    local_client = client_factory(
        f"mongodb://127.0.0.1:{mongo_port}/?directConnection=true",
        serverSelectionTimeoutMS=5000,
    )
    try:
        try:
            users = local_client.admin.command({"usersInfo": 1, "forAllDBs": True}).get("users", [])
        except PyMongoError as error:
            raise SystemExit(
                "MongoDB rejected unauthenticated user inspection "
                f"({safe_error_name(error)}); refusing to change existing credentials."
            ) from None

        if users:
            raise SystemExit(
                "MongoDB application authentication failed and existing users were found; "
                "refusing to alter database credentials."
            )

        local_client[credentials["auth_source"]].command(
            {
                "createUser": credentials["username"],
                "pwd": credentials["password"],
                "roles": [{"role": "readWrite", "db": credentials["database"]}],
            }
        )
    except PyMongoError as error:
        raise SystemExit(
            f"Could not create the least-privilege MongoDB application user ({safe_error_name(error)})."
        ) from None
    finally:
        local_client.close()

    verify_client = client_factory(uri, serverSelectionTimeoutMS=5000)
    try:
        verify_client[db_name].list_collection_names()
    except PyMongoError as error:
        raise SystemExit(
            f"MongoDB application user was created but authentication verification failed ({safe_error_name(error)})."
        ) from None
    finally:
        verify_client.close()

    return "Created and verified a readWrite-only MongoDB application user on an empty user store."


def main():
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        raise SystemExit("Usage: provision_local_mongo_user.py MONGO_PORT")

    environment = service_environment()
    uri = environment.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = environment.get("DB_NAME", "undangan_id")
    print(provision_application_user(uri, db_name, int(sys.argv[1])))


if __name__ == "__main__":
    main()
