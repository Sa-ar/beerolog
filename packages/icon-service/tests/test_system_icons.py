from beerolog_icon_service.system_icons import resolve_system_icon_requests


def test_system_icon_requests_cover_catalog_groups() -> None:
    requests = resolve_system_icon_requests()
    groups = {request.catalog_group for request in requests}
    assert groups == {"session.vibe", "session.abv", "journey", "flavor", "marketing"}
    purposes = {request.purpose for request in requests}
    assert "session:vibe:refreshing" in purposes
    assert "session:abv:low" in purposes
    assert "journey:quiz" in purposes
    assert "taste-profile:flavor:malty" in purposes
    assert "marketing:taste-quiz-hero" in purposes
