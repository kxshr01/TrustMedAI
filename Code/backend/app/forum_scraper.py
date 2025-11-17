import json
import time
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ----------------------
# Paths & constants
# ----------------------

RAW_DIR = Path("/Users/kaushikrajesh/Desktop/SEM3/SWM/TrustMedAI/Data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = RAW_DIR / "forum_raw.json"

BASE_URL = "https://www.diabetesdaily.com"
FORUM_BASE = "https://www.diabetesdaily.com/forum/forums/diabetes-news-studies.74/?order=view_count&direction=desc"


# ----------------------
# Selenium setup
# ----------------------

def create_driver():
    """Create and return a Chrome WebDriver instance."""
    options = webdriver.ChromeOptions()

    # For debugging, keep the browser visible.
    # Once everything works, you can uncomment headless mode.
    # options.add_argument("--headless=new")

    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    # Implicit wait for element lookups
    driver.implicitly_wait(5)
    return driver


def forum_page_url(page: int) -> str:
    """Return the correct URL for a given forum page."""
    if page == 1:
        return FORUM_BASE + "/"  # First page has no page-1 suffix
    return f"{FORUM_BASE}/page-{page}"


# ----------------------
# Thread scraping
# ----------------------

def scrape_thread(driver, thread_url: str):
    """Extract question + all answers inside a single thread."""
    try:
        full_url = urljoin(BASE_URL, thread_url)
        print(f"    [THREAD] Opening {full_url}")
        driver.get(full_url)

        # If Cloudflare shows a challenge, you might see a "Just a moment" page.
        # On first run, watch the browser. If needed, solve the challenge manually once.

        # Wait until the title of the thread is present
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "h1.p-title-value"))
            )
        except Exception:
            print("    [WARN] No title found (maybe blocked / different layout):", full_url)
            return None

        html = driver.page_source
        soup = BeautifulSoup(html, "lxml")

        # Title = main question
        title_tag = soup.find("h1", class_="p-title-value")
        if not title_tag:
            print("    [WARN] No title tag in soup for:", full_url)
            return None

        question = title_tag.get_text(strip=True)

        # Posts (first post = original question details)
        posts = soup.find_all("article", class_="message-body")
        if not posts:
            # Fallback: try a slightly more generic selector
            posts = soup.select("div.message-body, article.message-body")

        if not posts:
            print("    [WARN] No posts found for:", full_url)
            return None

        answers = []
        # Skip the first post (original question) and treat the rest as answers
        for p in posts[1:]:
            text = p.get_text(separator="\n").strip()
            if len(text) > 10:
                answers.append(text)

        best_answer = max(answers, key=len) if answers else ""

        return {
            "question": question,
            "answers": answers,
            "best_answer": best_answer,
            "url": full_url,
        }

    except Exception as e:
        print("    [ERR] Failed to scrape thread:", thread_url, e)
        return None


# ----------------------
# Forum listing scraping
# ----------------------

def scrape_forum(max_threads=500):
    print("[INFO] Starting DiabetesDaily Selenium scrape...")

    driver = create_driver()
    results = []
    page = 1

    try:
        while len(results) < max_threads:
            url = forum_page_url(page)
            print(f"[INFO] Scraping page {page}: {url}")
            driver.get(url)

            # Give Cloudflare / JS some time to settle
            time.sleep(3)

            # Wait for thread items to appear
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_all_elements_located(
                        (By.CSS_SELECTOR, "div.structItem--thread")
                    )
                )
            except Exception:
                print(f"[WARN] No thread containers found on page {page}. Stopping.")
                break

            html = driver.page_source
            soup = BeautifulSoup(html, "lxml")

            thread_divs = soup.select("div.structItem.structItem--thread")
            print(f"[DEBUG] Found {len(thread_divs)} threads on page {page}")

            thread_links = []
            for div in thread_divs:
                title_div = div.find("div", class_="structItem-title")
                if not title_div:
                    continue
                a_tag = title_div.find("a", href=True)
                if a_tag:
                    thread_links.append(a_tag["href"])


            print(f"[INFO] Found {len(thread_links)} thread links on page {page}")

            # Visit each thread and extract data
            for thread_link in thread_links:
                if len(results) >= max_threads:
                    break

                data = scrape_thread(driver, thread_link)
                if data:
                    results.append(data)
                    print(f"    [OK] Collected thread #{len(results)}")

                # Be nice to the server
                time.sleep(1)

            page += 1
            # Small pause between pages
            time.sleep(2)

    finally:
        driver.quit()

    print(f"[SUCCESS] Scraped {len(results)} threads.")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("[SAVED] Raw forum data →", OUTPUT_FILE)


if __name__ == "__main__":
    scrape_forum(max_threads=200)  # adjust as you like
