from app.config import Settings


def test_settings_parse_comma_separated_cors_origins():
    settings = Settings(
        cors_allowed_origins="http://localhost:3000, https://beerolog.app ,https://preview.beerolog.app"
    )

    assert settings.cors_allowed_origins == [
        "http://localhost:3000",
        "https://beerolog.app",
        "https://preview.beerolog.app",
    ]
