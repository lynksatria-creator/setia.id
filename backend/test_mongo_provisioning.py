import pytest
from pymongo.errors import OperationFailure

from backend.provision_local_mongo_user import local_credentials, provision_application_user


class FakeDatabase:
    def __init__(self, state, authenticated):
        self.state = state
        self.authenticated = authenticated

    def list_collection_names(self):
        if self.authenticated and not self.state["user_created"]:
            raise OperationFailure("authentication failed", 18)
        return []

    def command(self, command):
        if "usersInfo" in command:
            return {"users": self.state["users"]}
        if "createUser" in command:
            self.state["user_created"] = True
            self.state["created_user"] = command
            return {"ok": 1}
        raise AssertionError("Unexpected MongoDB command")


class FakeClient:
    def __init__(self, state, authenticated):
        self.state = state
        self.authenticated = authenticated
        self.admin = FakeDatabase(state, authenticated)

    def __getitem__(self, _name):
        return FakeDatabase(self.state, self.authenticated)

    def close(self):
        pass


def test_local_credentials_decode_encoded_values_and_respect_auth_source():
    assert local_credentials(
        "mongodb://app%40user:p%40ss@localhost:27018/undangan_id?authSource=admin",
        "undangan_id",
        27018,
    ) == {
        "username": "app@user",
        "password": "p@ss",
        "auth_source": "admin",
        "database": "undangan_id",
    }


@pytest.mark.parametrize(
    "uri",
    [
        "mongodb://localhost:27018/undangan_id",
        "mongodb://user:pass@mongo.example.net:27018/undangan_id",
        "mongodb://user:pass@localhost:27017/undangan_id",
        "mongodb://user:pass@localhost:27018/undangan_id?authMechanism=MONGODB-X509",
    ],
)
def test_local_credentials_skip_unsupported_targets(uri):
    assert local_credentials(uri, "undangan_id", 27018) is None


def test_provisioning_creates_scoped_user_only_when_user_store_is_empty():
    state = {"users": [], "user_created": False}
    uri = "mongodb://app:secret@localhost:27018/undangan_id?authSource=admin"

    def client_factory(connection_uri, **_kwargs):
        return FakeClient(state, connection_uri == uri)

    result = provision_application_user(uri, "undangan_id", 27018, client_factory)

    assert result.startswith("Created and verified")
    assert state["created_user"] == {
        "createUser": "app",
        "pwd": "secret",
        "roles": [{"role": "readWrite", "db": "undangan_id"}],
    }


def test_provisioning_refuses_to_change_existing_users():
    state = {"users": [{"user": "existing", "db": "admin"}], "user_created": False}
    uri = "mongodb://app:secret@localhost:27018/undangan_id?authSource=admin"

    def client_factory(connection_uri, **_kwargs):
        return FakeClient(state, connection_uri == uri)

    with pytest.raises(SystemExit, match="existing users were found"):
        provision_application_user(uri, "undangan_id", 27018, client_factory)

    assert not state["user_created"]
