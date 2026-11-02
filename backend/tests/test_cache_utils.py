from app.core.cache_utils import admin_users_cache_key_builder


def test_admin_users_fallback_cache_key_includes_is_active():
    def list_users():
        pass

    active_key = admin_users_cache_key_builder(
        list_users,
        namespace="admin-users",
        kwargs={"is_active": True},
    )
    inactive_key = admin_users_cache_key_builder(
        list_users,
        namespace="admin-users",
        kwargs={"is_active": False},
    )

    assert active_key != inactive_key
