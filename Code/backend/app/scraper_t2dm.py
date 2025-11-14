import os
from pathlib import Path
import requests
from bs4 import BeautifulSoup
import json

# -------------------------------------------------------
# Paths
# -------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parents[3]  # TrustMedAI/
RAW_DIR = BASE_DIR / "Data" / "raw"
PROCESSED_DIR = BASE_DIR / "Data" / "processed"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------
# Sources to scrape
# -------------------------------------------------------
T2DM_SOURCES = [
    {
        "id": "mayo_t2dm_overview",
        "site": "mayo",
        "url": "https://www.mayoclinic.org/diseases-conditions/type-2-diabetes/symptoms-causes/syc-20351193",
    },
    {
        "id": "medlineplus_t2dm",
        "site": "medlineplus",
        "url": "https://medlineplus.gov/diabetes.html",
    },
    {
        "id": "nih_niddk_t2dm",
        "site": "nih",
        "url": "https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/type-2-diabetes",
    }
]


# -------------------------------------------------------
# Utilities
# -------------------------------------------------------
def fetch_html(url: str) -> str:
    """
    Downloads HTML using requests with a user-agent header.
    Returns HTML string.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (TrustMedAI/0.1; +https://github.com/kxshr01)"
    }

    print(f"[INFO] Fetching URL: {url}")
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    return response.text


def save_raw_html(source_id: str, html: str):
    """
    Save raw HTML to Data/raw/<id>.html
    """
    out_file = RAW_DIR / f"{source_id}.html"
    out_file.write_text(html, encoding="utf-8")
    print(f"[INFO] Saved raw HTML → {out_file}")


# -------------------------------------------------------
# Site-specific parsers
# -------------------------------------------------------
def parse_mayo_to_json(html: str) -> list:
    soup = BeautifulSoup(html, "lxml")
    article = soup.find("article")

    if not article:
        print("[WARN] <article> not found. Returning empty.")
        return []

    # Sections we want to ignore (footer, ads, misc)
    IGNORE_SECTIONS = [
        "Products & Services",
        "From Mayo Clinic to your inbox",
        "Related",
        "News from Mayo Clinic",
        "Mayo Clinic Press",
        "Doctors & departments",
        "Type 2 diabetes",  # footer sections
    ]

    results = []
    current_section = None
    current_subsection = None

    structured = {}  # { section_name: { subsection_name: [content] } }

    for tag in article.descendants:

        # MAIN SECTIONS = <h2>
        if tag.name == "h2":
            sec = tag.get_text(strip=True)

            if sec in IGNORE_SECTIONS:
                current_section = None
                current_subsection = None
                continue

            current_section = sec
            current_subsection = None

            if sec not in structured:
                structured[sec] = {}

            if None not in structured[sec]:
                structured[sec][None] = []

        # SUBSECTION = <h3>
        elif tag.name == "h3":
            sub = tag.get_text(strip=True)

            current_subsection = sub

            if current_section not in structured:
                continue

            if sub not in structured[current_section]:
                structured[current_section][sub] = []

        # PARAGRAPHS
        elif tag.name == "p":
            if current_section is None:
                continue

            text = tag.get_text(strip=True)
            if not text:
                continue

            structured[current_section][current_subsection].append(text)

        # BULLETS
        elif tag.name == "ul":
            if current_section is None:
                continue

            bullets = [
                "- " + li.get_text(strip=True)
                for li in tag.find_all("li")
            ]

            structured[current_section][current_subsection].extend(bullets)

    # Convert nested dict → list format
    final = []
    for sec, subsecs in structured.items():
        section_entry = {
            "section": sec,
            "subsections": []
        }

        for sub, content in subsecs.items():
            section_entry["subsections"].append({
                "title": sub,
                "content": content
            })

        final.append(section_entry)

    return final


def parse_generic_site_to_json(html: str) -> list:
    """
    Structured parser for NIH, MedlinePlus, etc.
    Extracts <h2>, <h3>, <p>, and <ul><li> into a clean hierarchical JSON format.

    """

    soup = BeautifulSoup(html, "lxml")

    # Sections to ignore across all sites
    IGNORE_SECTIONS = [
        "Products & Services",
        "Related",
        "References",
        "Resources",
        "Subscribe",
        "Newsletter",
        "More Information",
        "FAQ",
        "FAQs",
        "Editorial Policy",
        "Privacy",    
        "Disclaimers",
        "Terms",
        "Citations",
        "Acknowledgments",
        "Additional resources",
        "Our Partners",
        "Contact",
        "Connect with us",
        "Follow Us",
    ]

    structured = {}
    current_section = None
    current_subsection = None

    # Get all meaningful content tags in order
    content_tags = soup.find_all(["h1", "h2", "h3", "p", "ul"])

    for tag in content_tags:

        # ========================
        # MAIN SECTION (H2)
        # ========================
        if tag.name == "h2":
            sec = tag.get_text(strip=True)

            if not sec or sec in IGNORE_SECTIONS:
                current_section = None
                current_subsection = None
                continue

            current_section = sec
            current_subsection = None

            if sec not in structured:
                structured[sec] = {}

            if None not in structured[sec]:
                structured[sec][None] = []

            continue

        # ========================
        # SUBSECTION (H3)
        # ========================
        if tag.name == "h3":
            sub = tag.get_text(strip=True)
            if not current_section:
                continue

            current_subsection = sub

            if sub not in structured[current_section]:
                structured[current_section][sub] = []

            continue

        # ========================
        # PARAGRAPH
        # ========================
        if tag.name == "p":
            if not current_section:
                continue

            text = tag.get_text(strip=True)
            if not text:
                continue

            structured[current_section][current_subsection].append(text)
            continue

        # ========================
        # BULLETS
        # ========================
        if tag.name == "ul":
            if not current_section:
                continue

            for li in tag.find_all("li"):
                bullet = li.get_text(strip=True)
                if bullet:
                    structured[current_section][current_subsection].append(f"- {bullet}")

            continue

    # ========================
    # CONVERT dict → final JSON list
    # ========================
    final = []
    for sec, subsecs in structured.items():
        section_entry = {
            "section": sec,
            "subsections": []
        }

        for sub, content in subsecs.items():
            section_entry["subsections"].append({
                "title": sub,
                "content": content
            })

        final.append(section_entry)

    return final



def save_json(source_id: str, data: list):
    out_file = PROCESSED_DIR / f"{source_id}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[INFO] Saved processed JSON → {out_file}")


# -------------------------------------------------------
# Main scraper orchestrator
# -------------------------------------------------------
def main():
    for src in T2DM_SOURCES:
        sid = src["id"]
        url = src["url"]
        site = src["site"]

        print("\n" + "="*60)
        print(f"[INFO] Processing source: {sid}")
        print("="*60)

        # Step 1: Fetch HTML
        html = fetch_html(url)

        # Step 2: Save raw HTML
        save_raw_html(sid, html)

        # Step 3: Site-specific parsing
        # Process HTML based on site
        if site == "mayo":
            processed = parse_mayo_to_json(html)
        else:
            processed = parse_generic_site_to_json(html)

        # Save JSON output
        if processed:
            save_json(sid, processed)
        else:
            print(f"[WARN] No processed data extracted for {sid}.")

    print("\n[INFO] Scraping complete!")


if __name__ == "__main__":
    main()
