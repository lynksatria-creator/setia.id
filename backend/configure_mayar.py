"""Store a Mayar API key in the local backend environment file."""

from getpass import getpass
from pathlib import Path

from dotenv import set_key


ENV_FILE = Path(__file__).with_name(".env")


def main():
    if not ENV_FILE.is_file():
        raise SystemExit("backend/.env is missing. Copy backend/.env.example to backend/.env first.")

    api_key = getpass("Paste your Mayar Read & Write API Key (input hidden): ").strip()
    if not api_key:
        raise SystemExit("Mayar API Key cannot be empty.")

    environment = input("Mayar environment: [1] Production, [2] Sandbox: ").strip()
    if environment not in {"1", "2"}:
        raise SystemExit("Choose 1 for Production or 2 for Sandbox.")

    set_key(str(ENV_FILE), "MAYAR_API_KEY", api_key, quote_mode="never")
    set_key(str(ENV_FILE), "MAYAR_IS_SANDBOX", "true" if environment == "2" else "false", quote_mode="never")
    print("Mayar API Key stored in ignored backend/.env. Restart the API to apply it.")


if __name__ == "__main__":
    main()
