#!/usr/bin/env python3
"""Merge catalog sources, dedupe, enrich, and re-host product images.

Sources:
  - packages/db/data/israel-catalog.json (existing)
  - Beer & Beyond Shopify JSON (Israeli vendors)
  - Schnitt tap list + can lineup (schnitt.co.il)

Output:
  - packages/db/data/israel-catalog.json (updated)
  - apps/web/public/catalog/beers/* (new/updated images)

No third-party URLs in DB fields (images re-hosted under /catalog/beers/).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

import urllib.request

REPO = Path(__file__).resolve().parents[4]
CATALOG_PATH = REPO / "packages/db/data/israel-catalog.json"
IMAGE_DIR = REPO / "apps/web/public/catalog/beers"
IMAGE_BASE = "/catalog/beers"  # local staging path before Vercel Blob upload
BLOB_HOST = "blob.vercel-storage.com"

BB_PAGE1 = Path(
    "/Users/saardavidson/.cursor/projects/Users-saardavidson-Dev-beerolog/agent-tools/25f6253f-1067-49d7-a333-6149ead52b88.txt"
)
BB_PAGE2 = Path(
    "/Users/saardavidson/.cursor/projects/Users-saardavidson-Dev-beerolog/agent-tools/ffa449e0-5150-4a04-a8a1-234ca0f9758d.txt"
)

BREWERY_ALIASES: dict[str, str] = {
    "שניט": "Schnitt",
    "שפירא": "Shapira",
    "הרצל": "Herzl",
    "מלכה": "Malka",
    "נגב": "Negev",
    "שבט": "Shevet",
    "הגיבור": "Hagibor",
    "בירה שקמה": "Shikma",
    "אוק אנד אש": "Oak & Ash",
    "טייבה": "Taybeh",
    "שריגים": "Srigim",
    "מילק אנד האני": "Milk & Honey",
    "בירבזאר": "BeerBazaar",
    "המתססה": "HaMitasesa",
    "קישקשתא": "Kishkashta",
    "malka (מלכה)": "Malka",
    "alexander (אלכסנדר)": "Alexander",
    "jem's beer factory": "Jem's Beer Factory",
    "israel beer breweries ltd. (ibbl)": "Israel Beer Breweries",
    "new pioneer brewing co - חלוץ חדש": "New Pioneer Brewing Co",
    "mosco (מוסקו) / פפא": "Mosco",
}

IMPORT_VENDOR_COUNTRY: dict[str, str] = {
    "Brewdog": "GB",
    "Brouwerij St. Bernardus": "BE",
    "Bieres de Chimay": "BE",
    "Duvel Moortgat": "BE",
    "Brasserie Lefebvre": "BE",
    "Brasserrie d'Achouffe": "BE",
    "Lagunitas Brewing Company": "US",
    "Blue Moon": "US",
    "Erdinger": "DE",
    "Spaten-Franziskaner-Lowenbrau": "DE",
    "Schlenkerla": "DE",
    "Primator": "CZ",
    "Budejovicky Budvar": "CZ",
    "Guinness": "IE",
    "Wychwood Brewery": "GB",
    "Thornbridge": "GB",
    "Marston's Brewery": "GB",
    "Volfas Engelman": "LT",
    "HORIZONT Brewing": "HU",
    "Omnipollo": "SE",
    "Mikkeller": "DK",
    "Pohjala": "EE",
    "Gueuzerie Tilquin": "BE",
    "Brouwerij Lindemans": "BE",
    "Kasteel Brouwerij Vanhonsebrouck": "BE",
    "Anheuser-Busch": "US",
    "Beck's": "DE",
    "Beavertown": "GB",
    "Damm": "ES",
    "Kiuchi Brewery": "JP",
    "John Crabbie & Co": "GB",
    "Cesu Alus": "LV",
    "Wolf's Brewery": "RU",
    "Tucher Brau": "DE",
    "Schloss Eggenberg": "AT",
    "Swinkels Family Brewers": "NL",
    "Thatchers": "GB",
    "Abbaye de Maredsous": "BE",
    "Bayerische Staatsbrauerei Weihenstephaner": "DE",
    "Volynski Browar": "UA",
    "Arpus": "LV",
    "Full Moon Brew Works": "IN",
    "Nepo Brewing": "CZ",
    "Canediguerra": "ES",
    "Olvi": "FI",
    "Maryensztadt": "PL",
    "Hoegaarden": "BE",
    "Leffe": "BE",
    "Weihenstephan": "DE",
    "Grupo Modelo": "MX",
}

# Preferred Schnitt display names (dedupe B&B "Schnitt X" vs tap-list names)
SCHNITT_DISPLAY_NAMES: dict[str, str] = {
    "hope neipa": "HOPE",
    "hope": "HOPE",
    "double intergalactica": "Double Interglactica",
    "double interglactica": "Double Interglactica",
    "porter sons chocolate orange": "Porter Chocolate Orange",
    "porter sons amarena cherry": "Porter & Sons Amarena Cherry",
    "porter sons salted caramel": "Porter & Sons Salted Caramel",
    "day shift": "Day Shift",
    "in the little": "In The Little",
    "what was was": "What Was Was",
    "world cup 2026": "World Cup 2026",
    "orange blossom": "Orange Blossom",
    "eternal struggle": "Eternal Struggle",
    "blueberry brioche": "Blueberry Brioche",
    "el hombre": "El Hombre",
    "elderflower": "Elderflower",
    "sab kuch milega": "Sab Kuch Milega",
    "kuch kuch": "Kuch Kuch",
    "hoppywood pils": "Hoppywood Pils",
    "double trouble": "Double Trouble",
    "abbey mode": "Abbey Mode",
    "cactus sour": "Cactus Sour",
    "luigi": "Luigi",
    "nightmare fuel": "Nightmare Fuel",
    "hadar": "Hadar",
    "flu fighters": "Flu Fighters",
    "koresh": "Koresh",
    "yes yes no no": "Yes Yes No No",
    "why like this": "Why Like This",
    "tea party masala": "Tea Party: Masala",
    "lazy bee mead": "Lazy Bee Classic",
    "lazy bee raspberry hibiscus mead": "Lazy Bee With Hibiscus and Raspberries",
    # Rotating board / OCR variants
    "alt shift": "Alt Shift",
    "guavallicious": "Guavallicious",
    "guavalicious": "Guavallicious",
    "lazy bee": "Lazy Bee",
    "de bruyne": "De Bruyne",
    "who is dunkelman": "Who is Dunkelman",
    "something something": "Something Something",
    "sour stout tonka": "Sour Stout & Tonka",
    "mr goldings ipa": "Mr Goldings IPA",
    "cherry shower sour": "Cherry Shower Sour",
    "when life gives you grapefruit": "When Life Gives You Grapefruit",
    "hi techs": "Hi-Techs",
    "hi-techs": "Hi-Techs",
}

# Untappd search noise without a retail source — not sold as catalog SKUs
PRUNE_BREWERIES = {
    "Beer Belly Israel",
    "פֶּרֶא - Pe're wild beer",
    "Israel Canyon",
    "Mystic Mountain Brewery (Israel)",
    "Post Apocalyptic",
    "Doug Harm's Homebrew",
    "Losantiville Brewing Company",
    "ClubGonzo",
    "Ben's Beard Beer",
    "Pastor's Pride",
    "Kovacs Israel Ein Gedi",
    "Oscar Beer בירה אוסקר",
    "Batra Homebrewery",
    "Heisenberg",
    "Baron's Brewery",
    "Israël's Bier",
    "Beer'd Brewing Company",
    "Crooked Spider",
    "Black Pond Brews",
    "Copper Pig Brewery",
    "Drinkforpeace",
    "The Crossings Restaurant & Brew Pub",
    "Adroit Theory",
    "Birrificio Abbazia San Benedetto",
    "Cerveceria Non Grata",
    "Hoax Brewing Company",
    "Mikkeller Brewing San Diego",
    "Cold Spring Brewery",
    "Brauerei & Gasthof Zwanzger",
    "Calango Sidra Artesanal",
    "Israel Peña",
}

COUNTRY_BY_BREWERY: dict[str, str] = {
    "Schnitt": "IL",
    "Shapira": "IL",
    "Herzl": "IL",
    "Malka": "IL",
    "Negev": "IL",
    "Shevet": "IL",
    "Hagibor": "IL",
    "Shikma": "IL",
    "Oak & Ash": "IL",
    "Taybeh": "PS",
    "Srigim": "IL",
    "Milk & Honey": "IL",
    "BeerBazaar": "IL",
    "Alexander": "IL",
    "Jem's Beer Factory": "IL",
    "Israel Beer Breweries": "IL",
    "Mosco": "IL",
    "New Pioneer Brewing Co": "IL",
}

STYLE_VOCAB = {
    "ipa": "American IPA",
    "india pale ale": "American IPA",
    "pale ale": "Pale Ale",
    "lager": "Lager",
    "pilsner": "Pilsner",
    "stout": "Stout",
    "porter": "Porter",
    "witbier": "Witbier",
    "hefeweizen": "Hefeweizen",
    "neipa": "Hazy IPA",
    "session ipa": "Session IPA",
    "hoppy lager": "Hoppy Lager",
}

SKIP_TITLE_FRAGMENTS = (
    "מארז",
    "1+1",
    "מגוון בירות",
    "כוס ",
    "כוסות",
    "gift card",
    "מתנה",
    "פיצוחים",
    "סדנא",
    "ג'ין",
    "גין ",
    "וויסקי",
    "ויסקי",
    "vodka",
    "ארק",
    "arak",
    "brandy",
    "קג",
    "keg",
    "highball",
    "single malt",
    "6-pack",
    "6 pack",
    "סט ",
    " set",
    "טקילה",
    "bitters",
    "vermouth",
    "wine cask",
    " casks",
    "כל המוצרים",
    "all 5 products",
    "icons",
    "trio",
    "brewmaster",
    "beer set",
    "beer spirits",
    "distilled",
    "aged double oak blend",
    "mixed ",
    "case",
    "ארגז",
)

SKIP_VENDORS = {
    "Hacarem",
    "Thinkers",
    "Jullius",
    "מגוון מבשלות בירה",
    "Schmulz",
    "המתססה",
}

NON_BEER_STYLE_FRAGMENTS = (
    "gin",
    "whisky",
    "whiskey",
    "vodka",
    "arak",
    "brandy",
    "bitters",
    "vermouth",
    "cider",
    "mead",
    "highball",
    "single malt",
    "spirit",
    "distilled",
)

NON_BEER_NAME_FRAGMENTS = (
    "gin ",
    " gin",
    "ג'ין",
    "גין ",
    "beer spirit",
    "ביר ספיריט",
    "תזקיק",
    "distilled",
    "מזוקק",
    "whisky",
    "whiskey",
    "וויסקי",
    "vodka",
    "arak",
    "brandy",
)

BUNDLE_NAME_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b6[\s-]?pack\b", re.I),
    re.compile(r"\bsix[\s-]?pack\b", re.I),
    re.compile(r"\b12[\s-]?pack\b", re.I),
    re.compile(r"\b24[\s-]?pack\b", re.I),
    re.compile(r"\bbeer\s+set\b", re.I),
    re.compile(r"\bcans?\s+case\b", re.I),
    re.compile(r"\bmixed\b", re.I),
    re.compile(r"\bicons\b", re.I),
    re.compile(r"\btrio\b", re.I),
    re.compile(r"\bkeg\b", re.I),
    re.compile(r"sale\s*3\+1", re.I),
    re.compile(r"\b3\+1\b"),
    re.compile(r"night\s+shift\s+mix", re.I),
    re.compile(r"שישיית"),
    re.compile(r"מארז"),
    re.compile(r"ארגז"),
    re.compile(r"סט בירה"),
    re.compile(r"מיקס פחיות"),
    re.compile(r"כל הסדרה"),
    re.compile(r"מבצע.*3\+1"),
)


def is_bundle_listing(*texts: str | None) -> bool:
    combined = " ".join(t for t in texts if t).strip()
    if not combined:
        return False
    return any(p.search(combined) for p in BUNDLE_NAME_PATTERNS)


def is_non_beer_product(
    title: str = "",
    name: str = "",
    name_hebrew: str | None = None,
    style: str = "",
) -> bool:
    combined = f"{title} {name} {name_hebrew or ''} {style}".lower()
    if any(x in combined for x in NON_BEER_NAME_FRAGMENTS):
        return True
    style_low = style.lower()
    if any(x in style_low for x in NON_BEER_STYLE_FRAGMENTS):
        return True
    if any(s.lower() in combined for s in SKIP_TITLE_FRAGMENTS):
        return True
    # generic Shopify style with bundle-shaped name
    if style.strip() in {"בירה", "Beer"} and is_bundle_listing(name, name_hebrew, title):
        return True
    return False


def should_skip_product(
    title: str,
    name: str,
    name_hebrew: str | None,
    style: str,
) -> bool:
    if is_bundle_listing(title, name, name_hebrew):
        return True
    combined = f"{title} {name} {name_hebrew or ''}".lower()
    if any(x in combined for x in NON_BEER_NAME_FRAGMENTS):
        return True
    if any(s.lower() in combined for s in SKIP_TITLE_FRAGMENTS):
        return True
    if style.strip() in {"בירה", "Beer"} and is_bundle_listing(name, name_hebrew, title):
        return True
    return False


@dataclass
class BeerDraft:
    name: str
    brewery: str
    brewery_country: str
    raw_style: str
    abv: float
    ibu: int | None = None
    name_hebrew: str | None = None
    tasting_notes: str | None = None
    tasting_notes_lang: str = "en"
    notes_source: str = "brewery"
    image_url_remote: str | None = None
    source_url: str | None = None
    hops: list[str] | None = None
    malts: list[str] | None = None
    yeast: str | None = None
    raw_color: str | None = None
    raw_body: str | None = None
  # provenance for merge scoring
    _score: int = 0


def slugify(*parts: str) -> str:
    text = "-".join(parts).lower()
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def normalize_brewery(name: str) -> str:
    key = name.strip()
    low = key.lower()
    if low in BREWERY_ALIASES:
        return BREWERY_ALIASES[low]
    if key in BREWERY_ALIASES:
        return BREWERY_ALIASES[key]
    return key


def normalize_name_key(name: str, brewery: str | None = None) -> str:
    n = name.lower().strip()
    n = re.sub(r"\s*\([^)]*\)", "", n)
    n = re.sub(r"\s*:\s*", " ", n)
    if brewery:
        br = normalize_brewery(brewery).lower()
        for prefix in (br, br.replace("'", ""), "schnitt"):
            if n.startswith(prefix + " "):
                n = n[len(prefix) + 1 :]
    n = re.sub(r"[^a-z0-9\u0590-\u05ff\s]", "", n)
    n = re.sub(r"\s+", " ", n)
    n = n.replace("day shify", "day shift")
    n = n.replace("porter sons chocolate orange", "porter chocolate orange")
    n = n.replace("porter&sons chocolate orange", "porter chocolate orange")
    return n.strip()


def canonical_product_name(name: str, brewery: str) -> str:
    """Collapse retail format variants to one catalog identity where appropriate."""
    b = normalize_brewery(brewery)
    n = name.strip()
    low = n.lower()
    if b == "Schnitt":
        if low.startswith("schnitt "):
            n = n[8:].strip()
            low = n.lower()
        key = normalize_name_key(n, brewery)
        return SCHNITT_DISPLAY_NAMES.get(key, n)
    if b == "Malka" and "admonit" in low:
        return "Malka Admonit"
    if b == "Alexander" and low in {"green", "green (גרין)"}:
        return "Green"
    return n


def dedupe_key(brewery: str, name: str) -> str:
    canon = canonical_product_name(name, brewery)
    return f"{normalize_brewery(brewery).lower()}|{normalize_name_key(canon, brewery)}"


def parse_title(title: str) -> tuple[str, str | None]:
    """Return (display_name, name_hebrew)."""
    title = re.sub(r"<[^>]+>", "", title).strip()
    if " - " in title:
        he, en = title.split(" - ", 1)
        he, en = he.strip(), en.strip()
        if re.search(r"[\u0590-\u05FF]", he) and not re.search(r"[\u0590-\u05FF]", en):
            return en, he
    if re.search(r"[\u0590-\u05FF]", title):
        return title, title
    return title, None


def extract_abv_from_tags(tags: list[str]) -> float | None:
    for tag in tags:
        m = re.match(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%", tag)
        if m:
            return (float(m.group(1)) + float(m.group(2))) / 2
        m = re.match(r"(\d+(?:\.\d+)?)%", tag)
        if m:
            return float(m.group(1))
    return None


def extract_style_from_tags(tags: list[str]) -> str | None:
    styles = [t for t in tags if re.search(r"IPA|Ale|Lager|Pilsner|Stout|Porter|Wheat|Wit|NEIPA|Sour|Mead|Cider|Bock|Tripel|Dubbel", t, re.I)]
    if styles:
        return styles[0]
    return None


def normalise_style(raw: str) -> str:
    key = raw.strip().lower()
    return STYLE_VOCAB.get(key, raw.strip())


def extract_ibu_from_html(body: str | None) -> int | None:
    """Parse IBU from Beer & Beyond product descriptions (Hebrew + English)."""
    if not body:
        return None
    text = re.sub(r"<[^>]+>", " ", body)
    text = re.sub(r"\s+", " ", text)
    patterns = (
        r"מרירות\s*\(IBU\)\s*[:\s]*(\d+)",
        r"מרירות[:\s]*(\d+)",
        r"(\d+)\s*מרירות",
        r"IBU[:\s]*(\d+)",
        r"(\d+)\s*IBU",
    )
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            val = int(m.group(1))
            if 0 < val <= 120:
                return val
    return None


def infer_ibu_from_style(style: str, abv: float) -> int | None:
    """Conservative style-based IBU estimate when no brewery source exists."""
    s = style.lower()
    if re.search(r"mead|cyser|melomel|braggot|תמד", s):
        return None
    if re.search(r"non-alcoholic|alkoholfrei|0%", s) or abv <= 0.5:
        return 12

    def clamp(v: int) -> int:
        return max(5, min(110, v))

    rules: list[tuple[str, int]] = [
        (r"double\s*ipa|dipa|triple\s*ipa", clamp(int(60 + (abv - 7.5) * 6))),
        (r"imperial\s*stout|russian\s*imperial", clamp(int(50 + (abv - 8) * 4))),
        (r"session\s*ipa|session\s*neipa", 32),
        (r"neipa|hazy\s*ipa|juicy\s*ipa", 28),
        (r"\bipa\b|india\s*pale", clamp(int(42 + (abv - 6) * 4))),
        (r"german\s*pils|pilsner|pils\b", 32),
        (r"hoppy\s*lager|pils.*hop", 28),
        (r"pale\s*lager|mexican\s*lager|helles|dunkel", 18),
        (r"\blager\b", 20),
        (r"dry\s*stout|irish\s*stout", 38),
        (r"stout", clamp(int(30 + (abv - 5) * 3))),
        (r"baltic\s*porter|porter", clamp(int(28 + (abv - 6) * 3))),
        (r"witbier|wit\b|hefeweizen|weissbier|weizen|wheat\s*beer", 14),
        (r"gose", 10),
        (r"sour|gueuze|lambic|kriek", 8),
        (r"tripel", 24),
        (r"dubbel|belgian\s*strong\s*dark|belgian\s*dubbel", 20),
        (r"belgian\s*blonde|blonde\s*ale|blond", 22),
        (r"saison|farmhouse", 28),
        (r"amber\s*ale|red\s*ale", 28),
        (r"pale\s*ale|apa\b", 35),
        (r"barleywine|strong\s*ale|scotch\s*ale", 45),
        (r"spiced|herbed", 22),
        (r"smoked|gro[dz]isk", 18),
    ]
    for pat, ibu in rules:
        if re.search(pat, s):
            return ibu
    return 25


def schnitt_tap_ibu_lookup() -> dict[str, int]:
    lookup: dict[str, int] = {}
    for name, _he, _style, _abv, ibu, _notes in schnitt_beers_raw_entries():
        if ibu is None:
            continue
        key = normalize_name_key(canonical_product_name(name, "Schnitt"), "Schnitt")
        lookup[key] = ibu
    return lookup


def schnitt_beers_raw_entries() -> list[tuple]:
    """Shared tap + can metadata for Schnitt (name, he, style, abv, ibu, notes)."""
    return [
        ("Gordi", None, "Grodziskie", 3.5, 20, "גרודזיטסקי — לתת חיטה מעושנת, קלילה עם מתיקות מלתת ועשן."),
        ("Cheers Alenbeer", None, "Session IPA", 4.8, 35, "סשן IPA לכבוד בר הצ'ירס — גוף קל, מפוצצת בכשות."),
        ("Nektron HaElim", "נקטרון האלים", "Hazy IPA", 6.1, None, "NEIPA מעוננת עם סנטניאל, קסקייד וזן ניו זילנדי."),
        ("Attali's Goes Med", None, "Session NEIPA", 5.5, 17, "שיתוף עם Attali's — סשן NEIPA קלילה וארומטית."),
        ("Guava Island", None, "Fruited NEIPA", 5.7, 27, "NEIPA עם מחית גויאבה וארומות טרופיות."),
        ("HaPils SheBaHadar", "הפילס שבחדר", "Pilsner", 5.0, 32, "פילסנר בהירה, מרירה ומאוזנת עם סיומת יבשה."),
        ("Achshav Me'unan", "עכשיו מעונן", "Hazy IPA", 6.0, 20, "NEIPA מעוננת עם מנגו וכשות סיטרה ומוזאיק."),
        ("Float", None, "Hazy IPA", 6.1, 20, "NEIPA קיצית עם סנטניאל, סימקו, אל דוראדו וקשמיר."),
        ("Kashmir", None, "Hoppy Lager", 4.9, 27, "לאגר כשותי עם ארומות הדריות מזן קשמיר."),
        ("Jaffa", None, "IPA", 6.5, 40, "West Coast IPA ענברית עם טוויסט תפוז."),
        ("Wit Win", None, "Witbier", 5.5, 20, "בירת חיטה בלגית עם כוסברה ודרי הופ."),
        ("Cactus Sour", None, "Fruited Sour", 5.9, None, "סאוור עם סברס ישראלי — חמוץ, פירותי ורענן."),
        ("Abbey Mode", None, "Belgian Dubbel", 7.1, None, "דאבל בלגי עשיר בארומות פירות יבשים וקרמל."),
        ("Porter Chocolate Orange", "פורטר שוקולד תפוז", "Porter", 7.5, None, "פורטר אמריקאית עם טוויסט שוקולד-תפוז."),
        ("Twist & Stout", None, "Dry Stout", 4.2, None, "סטאוט יבש קל עם קלייה וקקאו."),
        ("Luigi", None, "Italian Lager", 4.8, 30, "לאגר איטלקי בהיר וארומטי עם דריי הופ."),
        ("Day Shift", None, "Session IPA", 5.0, 30, "סשן IPA עם הדרים, אפרסק ומשמש עדין."),
        ("Yes Yes No No", None, "Hefeweizen", 5.2, None, "חיטה לא מסוננת בסגנון בווארי."),
        ("Why Like This", None, "Blonde Ale", 5.0, None, "בלונד בהירה, קלילה וארומטית."),
        ("In The Little", None, "Session IPA", 4.5, None, "סשן IPA — טעם גדול, גוף קטן."),
        ("What Was Was", None, "Hazy IPA", 6.0, None, "NEIPA מעורפלת ועשירה בארומות פירותיות."),
        ("World Cup 2026", None, "Session IPA", 4.5, None, "סשן IPA קלילה למונדיאל."),
        ("HOPE", None, "Hazy IPA", 6.5, None, "NEIPA בהירה, עשירה וארומטית."),
        ("Orange Blossom", None, "Pale Ale", 5.4, None, "פייל אייל עם אופי פרדס."),
        ("Eternal Struggle", None, "Amber Ale", 5.1, None, "ענברית קרמלית ומרעננת."),
        ("Blueberry Brioche", None, "Pastry Pale Ale", 5.0, None, "פייל אייל עם אופי קינוחי."),
        ("El Hombre", None, "Mexican Lager", 4.8, None, "לאגר מקסיקני עם ליים."),
        ("Elderflower", None, "Pale Ale", 5.4, None, "פייל אייל פרחונית ומרעננת."),
        ("Sab Kuch Milega", None, "Hoppy Lager", 4.7, None, "לאגר כשותי אופטימי."),
        ("Kuch Kuch", None, "IPA", 6.8, None, "IPA קלאסי שעושה את העבודה."),
        ("Double Interglactica", None, "Double IPA", 7.9, None, "דאבל NEIPA סמיכה וארומטית."),
        ("Tea Party: Masala", None, "Pale Ale", 5.0, None, "פייל אייל בניחוח צ'אי מסאלה."),
        ("Hoppywood Pils", None, "Hoppy Lager", 4.7, None, "פילסנר כשותי."),
        ("Double Trouble", None, "Double IPA", 8.6, None, "דאבל IPA חזקה ועשירה."),
        ("Hadar", "הדר", "Witbier", 5.0, None, "וויטbier עם תפוז — ענן חיטה וניצוץ הדרים."),
        ("Flu Fighters", None, "Spiced Ale", 5.2, None, "אירה מתובלת מפוצצת בטעמים."),
        ("Koresh", None, "Smoked Blonde Ale", 5.0, None, "בלונד מעושנת עם לימון פרסי ומלח."),
        ("Nightmare Fuel", None, "Porter", 8.0, None, "פורטר אמריקאית כהה וארומטית."),
        # Rotating tap-board SKUs (guest/seasonal boards photographed on-site).
        ("Alt Shift", None, "Session IPA", 5.0, 30, "סשן IPA קלילה ומרעננת — משמרת חלופית ל-Day Shift."),
        ("Guavallicious", None, "Fruited IPA", 6.0, 35, "IPA עם מחית גויאבה — טרופית ועסיסית."),
        ("Lazy Bee", None, "Honey Wheat Ale", 4.0, 12, "חיטה עם דבש — קלילה, פורחת ומתוקה בעדינות."),
        ("De Bruyne", None, "Witbier", 5.5, 15, "וויטbier בלגית עם כוסברה והדרים — על שם De Bruyne."),
        ("Who is Dunkelman", None, "Dunkelweizen", 5.3, 15, "חיטה כהה בווארית — קלויה, בננה ומין."),
        ("Something Something", None, "Blonde Ale", 5.1, 18, "בלונד עם דריי הופ — קלילה וארומטית."),
        ("Sour Stout & Tonka", None, "Sour Stout", 5.3, 20, "סטאוט חמוץ עם שעועית טונקה — קלוי, ונילי וחמצמץ."),
        ("Mr Goldings IPA", None, "English IPA", 6.2, 45, "IPA אנגלי עם כשות Goldings — הדרים ופרחים."),
        ("Cherry Shower Sour", None, "Fruited Sour", 7.0, 8, "סאוור עם דובדבנים — חמוץ, פירותי ועסיסי."),
        ("When Life Gives You Grapefruit", None, "Fruited NEIPA", 6.5, 45, "NEIPA עם אשכולית — הדרית ומעוננת."),
        ("Hi-Techs", None, "West Coast IPA", 7.2, 55, "West Coast IPA מרה ועצית."),
    ]


def build_bb_ibu_by_handle() -> dict[str, int]:
    lookup: dict[str, int] = {}
    for path in (BB_PAGE1, BB_PAGE2):
        if not path.exists():
            continue
        for p in json.loads(path.read_text())["products"]:
            ibu = extract_ibu_from_html(p.get("body_html"))
            handle = p.get("handle")
            if ibu and handle:
                lookup[handle] = ibu
    return lookup


def enrich_ibu(rows: list[dict]) -> dict[str, int]:
    """Fill missing IBU from B&B copy, Schnitt taps, then style inference."""
    bb_by_handle = build_bb_ibu_by_handle()
    schnitt_ibu = schnitt_tap_ibu_lookup()
    stats = {"bb_html": 0, "schnitt_tap": 0, "style_inferred": 0}

    for row in rows:
        if row.get("ibu") is not None:
            continue
        src = row.get("sourceUrl") or ""
        if "beerandbeyond.com/products/" in src:
            handle = src.rsplit("/", 1)[-1].split("?")[0]
            if handle in bb_by_handle:
                row["ibu"] = bb_by_handle[handle]
                stats["bb_html"] += 1
                continue
        if normalize_brewery(row["brewery"]) == "Schnitt":
            key = normalize_name_key(row["name"], "Schnitt")
            if key in schnitt_ibu:
                row["ibu"] = schnitt_ibu[key]
                stats["schnitt_tap"] += 1
                continue
        inferred = infer_ibu_from_style(row.get("style", ""), float(row.get("abv", 5)))
        if inferred is not None:
            row["ibu"] = inferred
            stats["style_inferred"] += 1

    return stats


def derive_color(style: str, raw: str | None = None) -> str:
    if raw and raw.lower() in {"pale", "gold", "amber", "brown", "dark"}:
        return raw.lower()
    s = style.lower()
    if re.search(r"stout|porter", s):
        return "dark"
    if "amber" in s or "red ale" in s:
        return "amber"
    if re.search(r"wheat|witbier|gose|saison", s):
        return "pale"
    if re.search(r"lager|pilsner", s):
        return "gold"
    return "gold"


def classify_market_tier(brewery: str, country: str) -> str:
    mainstream = {"Tempo", "Israel Beer Breweries", "Goldstar", "Maccabee"}
    if country == "IL":
        if brewery in mainstream:
            return "mainstream"
        return "craft"
    return "import"


def synthesise_notes(style: str, abv: float, brewery: str, hebrew: str | None) -> tuple[str, str]:
    if hebrew:
        return (
            f"{style} מ{brewery}. {abv}% אלכוהול.",
            "he",
        )
    return (f"A {style.lower()} from {brewery} at {abv}% ABV.", "en")


def completeness(row: dict) -> int:
    score = 0
    for k in ("ibu", "imageUrl", "tastingNotes", "nameHebrew", "hops", "malts"):
        if row.get(k):
            score += 2
    if row.get("notesSource") == "brewery":
        score += 3
    if row.get("sourceUrl"):
        score += 1
    return score


def draft_to_row(d: BeerDraft) -> dict:
    brewery = normalize_brewery(d.brewery)
    display_name = canonical_product_name(d.name, brewery)
    style = normalise_style(d.raw_style)
    notes = d.tasting_notes
    lang = d.tasting_notes_lang
    if not notes:
        notes, lang = synthesise_notes(style, d.abv, brewery, d.name_hebrew)
        source = "synthetic"
    else:
        source = d.notes_source
    country = d.brewery_country or COUNTRY_BY_BREWERY.get(brewery, "IL")
    return {
        "id": slugify(brewery, display_name),
        "name": display_name,
        "nameHebrew": d.name_hebrew,
        "brewery": brewery,
        "breweryCountry": country,
        "style": style,
        "abv": d.abv,
        "ibu": d.ibu,
        "hops": d.hops,
        "malts": d.malts,
        "yeast": d.yeast,
        "color": derive_color(style, d.raw_color),
        "body": None,
        "sweetness": None,
        "marketTier": classify_market_tier(brewery, country),
        "tastingNotes": notes,
        "tastingNotesLang": lang,
        "notesSource": source,
        "imageUrl": None,
        "sourceUrl": d.source_url,
        "_image_remote": d.image_url_remote,
        "_merge_score": d._score,
    }


def load_beer_and_beyond(include_imports: bool = True) -> list[BeerDraft]:
    drafts: list[BeerDraft] = []
    for path in (BB_PAGE1, BB_PAGE2):
        if not path.exists():
            continue
        for p in json.loads(path.read_text())["products"]:
            title = p.get("title") or ""
            if any(s.lower() in title.lower() for s in SKIP_TITLE_FRAGMENTS):
                continue
            vendor = p.get("vendor") or ""
            if vendor in SKIP_VENDORS:
                continue
            tags = p.get("tags") or []
            style = extract_style_from_tags(tags) or p.get("product_type") or "Other"
            style_low = style.lower()
            if any(x in style_low or x in title.lower() for x in NON_BEER_STYLE_FRAGMENTS):
                continue
            is_il = vendor in COUNTRY_BY_BREWERY or vendor in BREWERY_ALIASES or any(
                t == "ישראל" for t in tags
            )
            if not is_il and not include_imports:
                continue
            if not is_il and include_imports:
                # imports sold in IL — require a recognizable beer style tag
                if not extract_style_from_tags(tags):
                    continue
            name, hebrew = parse_title(title)
            if is_bundle_listing(title, name, hebrew):
                continue
            if any(x in f"{name} {hebrew or ''}".lower() for x in NON_BEER_NAME_FRAGMENTS):
                continue
            style = extract_style_from_tags(tags) or p.get("product_type") or "Other"
            abv = extract_abv_from_tags(tags) or 5.0
            body = re.sub(r"<[^>]+>", " ", p.get("body_html") or "")
            body = re.sub(r"\s+", " ", body).strip()
            ibu = extract_ibu_from_html(p.get("body_html"))
            img = p["images"][0]["src"] if p.get("images") else None
            brewery = normalize_brewery(vendor)
            country = (
                COUNTRY_BY_BREWERY.get(brewery)
                or IMPORT_VENDOR_COUNTRY.get(vendor)
                or IMPORT_VENDOR_COUNTRY.get(brewery)
            )
            if not country:
                country = "IL" if is_il else None
            if not is_il and not country:
                country_tag = next((t for t in tags if t in {
                    "אנגליה", "בלגיה", "גרמניה", "ארצות הברית", "אירלנד", "צ'כיה",
                    "הולנד", "דנמרק", "סקוטלנד", "אוסטריה", "ספרד", "צרפת",
                    "הונגריה", "אסטוניה", "לטביה", "רוסיה", "פולין", "פינלנד",
                    "הודו", "אוקראינה", "שוודיה", "יפן", "מקסיקו",
                }), None)
                country_map = {
                    "אנגליה": "GB", "בלגיה": "BE", "גרמניה": "DE", "ארצות הברית": "US",
                    "אירלנד": "IE", "צ'כיה": "CZ", "הולנד": "NL", "דנמרק": "DK",
                    "סקוטלנד": "GB", "אוסטריה": "AT", "ספרד": "ES", "צרפת": "FR",
                    "הונגריה": "HU", "אסטוניה": "EE", "לטביה": "LV", "רוסיה": "RU",
                    "פולין": "PL", "פינלנד": "FI", "הודו": "IN", "אוקראינה": "UA",
                    "שוודיה": "SE", "יפן": "JP", "מקסיקו": "MX",
                }
                country = country_map.get(country_tag, "XX") if country_tag else "XX"
            if country is None:
                country = "IL"
            if vendor == "טייבה":
                country = "PS"
            drafts.append(
                BeerDraft(
                    name=name,
                    name_hebrew=hebrew if hebrew != name else None,
                    brewery=brewery,
                    brewery_country=country,
                    raw_style=style,
                    abv=abv,
                    ibu=ibu,
                    tasting_notes=body[:500] if body else None,
                    tasting_notes_lang="he" if hebrew else "en",
                    notes_source="brewery" if body else "synthetic",
                    image_url_remote=img,
                    source_url=f"https://beerandbeyond.com/products/{p.get('handle')}",
                    _score=5,
                )
            )
    return drafts


def schnitt_beers() -> list[BeerDraft]:
    """Current Schnitt taps + core cans (schnitt.co.il)."""
    out: list[BeerDraft] = []
    for name, he, style, abv, ibu, notes in schnitt_beers_raw_entries():
        out.append(
            BeerDraft(
                name=name,
                name_hebrew=he,
                brewery="Schnitt",
                brewery_country="IL",
                raw_style=style,
                abv=abv,
                ibu=ibu,
                tasting_notes=notes,
                tasting_notes_lang="he" if he else "en",
                notes_source="brewery",
                source_url="https://schnitt.co.il/schnitt/beer-taps/",
                _score=6,
            )
        )
    return out


def load_existing() -> list[dict]:
    if not CATALOG_PATH.exists():
        return []
    return json.loads(CATALOG_PATH.read_text())


def merge_rows(existing: list[dict], drafts: list[BeerDraft]) -> tuple[list[dict], dict]:
    merged: dict[str, dict] = {}

    for row in existing:
        canon_name = canonical_product_name(row["name"], row["brewery"])
        key = dedupe_key(row["brewery"], canon_name)
        row = dict(row)
        row["name"] = canon_name
        row["id"] = slugify(normalize_brewery(row["brewery"]), canon_name)
        row.pop("adventurousness", None)
        row["_merge_score"] = completeness(row)
        merged[key] = row

    for d in drafts:
        row = draft_to_row(d)
        key = dedupe_key(row["brewery"], row["name"])
        if key not in merged or row["_merge_score"] > merged[key].get("_merge_score", 0):
            prev = merged.get(key, {})
            # keep better image if new lacks one
            if not row.get("_image_remote") and prev.get("_image_remote"):
                row["_image_remote"] = prev["_image_remote"]
            if not row.get("imageUrl") and prev.get("imageUrl"):
                row["imageUrl"] = prev["imageUrl"]
            for field in ("ibu", "nameHebrew", "tastingNotes", "hops", "malts"):
                if not row.get(field) and prev.get(field):
                    row[field] = prev[field]
            merged[key] = {**prev, **row}

    stats = {"before": len(existing), "after": len(merged), "added": len(merged) - len(existing)}
    return list(merged.values()), stats


def download_image(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BeerologCatalogBot/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        if len(data) < 200:
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def host_images(rows: list[dict]) -> int:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    hosted = 0
    for row in rows:
        remote = row.pop("_image_remote", None)
        beer_id = row["id"]
        if row.get("imageUrl") and (
            row["imageUrl"].startswith(IMAGE_BASE) or BLOB_HOST in row["imageUrl"]
        ):
            hosted += 1
            continue
        if not remote or "untappd" in remote.lower():
            continue
        ext = Path(urlparse(remote).path).suffix or ".jpg"
        if len(ext) > 5:
            ext = ".jpg"
        dest = IMAGE_DIR / f"{beer_id}{ext}"
        if dest.exists() or download_image(remote, dest):
            row["imageUrl"] = f"{IMAGE_BASE}/{beer_id}{ext}"
            hosted += 1
            print(f"  image: {beer_id}")
    return hosted


def upload_images_to_vercel_blob() -> None:
    """Push staged catalog images to Vercel Blob; updates israel-catalog.json in place."""
    if not os.environ.get("BLOB_READ_WRITE_TOKEN"):
        print("Skip Vercel Blob upload: BLOB_READ_WRITE_TOKEN not set")
        return
    print("Uploading staged images to Vercel Blob…")
    subprocess.run(
        ["pnpm", "--filter", "@beerolog/db", "upload:catalog-images"],
        cwd=REPO,
        check=True,
    )


def compute_adventurousness(catalog: list[dict]) -> None:
    tier_w = {"mainstream": 0.0, "craft": 0.5, "import": 0.3}
    counts: dict[str, int] = {}
    for b in catalog:
        counts[b["style"]] = counts.get(b["style"], 0) + 1
    total = len(catalog)
    for b in catalog:
        rarity = max(0, 1 - counts[b["style"]] / total * 3) * 0.3
        abv_c = max(0, min(0.2, (b["abv"] - 7.0) / 5.0))
        raw = tier_w[b["marketTier"]] + rarity + abv_c
        b["adventurousness"] = max(0, min(1, raw))


def fix_countries(rows: list[dict]) -> int:
    """Re-resolve breweryCountry for rows stuck at XX when vendor is known."""
    fixed = 0
    for row in rows:
        brewery = normalize_brewery(row["brewery"])
        resolved = (
            COUNTRY_BY_BREWERY.get(brewery)
            or IMPORT_VENDOR_COUNTRY.get(row["brewery"])
            or IMPORT_VENDOR_COUNTRY.get(brewery)
        )
        if resolved and row.get("breweryCountry") in (None, "XX"):
            row["breweryCountry"] = resolved
            fixed += 1
    return fixed


def prune_noise(rows: list[dict]) -> list[dict]:
    non_beer_vendors = {"Schmulz", "HaMitasesa", "Thinkers", "Milk & Honey", "Hacarem", "Jullius"}
    kept: list[dict] = []
    removed = 0
    removed_bundles = 0
    for row in rows:
        brewery = row["brewery"]
        src = row.get("sourceUrl") or ""
        if brewery in PRUNE_BREWERIES and not src:
            removed += 1
            continue
        if brewery in non_beer_vendors:
            removed += 1
            continue
        if row.get("breweryCountry") == "XX" and not src:
            removed += 1
            continue
        if should_skip_product(
            row.get("name", ""),
            row.get("name", ""),
            row.get("nameHebrew"),
            row.get("style", ""),
        ):
            removed += 1
            removed_bundles += 1
            continue
        # normalize duplicate mead vendor casing
        if brewery == "Mead In Israel":
            row["brewery"] = "Mead in Israel"
        kept.append(row)
    print(f"Pruned {removed} noise rows ({removed_bundles} bundles / spirits / non-beer SKUs)")
    return kept


def main() -> None:
    existing = load_existing()
    bb = load_beer_and_beyond()
    schnitt = schnitt_beers()
    print(f"Existing: {len(existing)} | Beer&Beyond IL: {len(bb)} | Schnitt: {len(schnitt)}")

    merged, stats = merge_rows(existing, bb + schnitt)
    print(f"After merge: {stats['after']} beers ({stats['added']:+d} net)")

    print("Hosting images…")
    hosted = host_images(merged)

    merged = prune_noise(merged)

    fixed = fix_countries(merged)
    if fixed:
        print(f"Resolved country for {fixed} rows")

    ibu_stats = enrich_ibu(merged)
    print(
        f"IBU enrichment: B&B copy {ibu_stats['bb_html']}, "
        f"Schnitt taps {ibu_stats['schnitt_tap']}, "
        f"style-inferred {ibu_stats['style_inferred']}"
    )

    for row in merged:
        row.pop("_merge_score", None)

    compute_adventurousness(merged)
    merged.sort(key=lambda b: (b["brewery"].lower(), b["name"].lower()))

    CATALOG_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    upload_images_to_vercel_blob()

    final_catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    no_img = sum(1 for b in final_catalog if not b.get("imageUrl"))
    on_blob = sum(
        1 for b in final_catalog if b.get("imageUrl") and BLOB_HOST in b["imageUrl"]
    )
    no_ibu = sum(1 for b in merged if b.get("ibu") is None)
    xx = sum(1 for b in merged if b.get("breweryCountry") == "XX")
    print(f"\nWrote {len(merged)} beers → {CATALOG_PATH}")
    print(f"  images staged locally: {hosted}, without image: {no_img}")
    print(f"  imageUrl on Vercel Blob: {on_blob}")
    print(f"  missing IBU: {no_ibu}")
    print(f"  breweryCountry=XX: {xx}")
    print(f"  Schnitt in catalog: {sum(1 for b in merged if b['brewery']=='Schnitt')}")


if __name__ == "__main__":
    main()
