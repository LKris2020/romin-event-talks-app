# BigQuery Release Pulse

BigQuery Release Pulse is a premium web application that fetches, parses, and formats the Google Cloud BigQuery release notes feed into a clean, modern, and interactive dashboard. Built with a Flask backend and a vanilla HTML/JS/CSS frontend, it enables users to search, filter, and share individual release notes directly on Twitter/X with a customized, character-validated tweet composer.

## 🚀 Key Features

*   **Granular Parsing**: Splits daily aggregated feed entries into individual cards based on update type (Features, Issues, Changes, Deprecations) for focused reading.
*   **Real-time Search & Filtering**: Fast client-side searching matching keywords against dates, categories, and descriptions, along with category pill toggles.
*   **Twitter/X Composer Modal**: Includes a mock Tweet composer card that auto-truncates updates to fit within the strict 280-character limit, properly treating URLs as exactly 23 characters (conforming to Twitter's `t.co` shortening).
*   **Responsive Glassmorphism UI**: Stunning default dark-slate theme with glowing gradients and backdrop blur filters. Features a complete light-mode theme toggle.
*   **In-Memory Caching**: Caches feed responses to prevent redundant requests and ensure fast page loads, with option to force a refresh using an animated spinner button.
*   **Export to CSV**: Download your currently searched/filtered release list instantly as a standard-compliant CSV file (escaping double quotes and commas automatically).

## 🛠️ Technology Stack

*   **Backend**: Python, Flask, `requests`, `feedparser`, `beautifulsoup4`
*   **Frontend**: Plain Vanilla HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Variables)
*   **Icons**: Inline SVGs (fully styleable via CSS)

## 📁 File Structure

```text
bq-release-notes/
├── app.py                  # Flask backend (routes, parser, and cache)
├── requirements.txt        # Backend dependencies
├── .gitignore              # Git ignore rules
├── templates/
│   └── index.html          # Semantic HTML layout
└── static/
    ├── css/
    │   └── style.css       # Design system, themes, and layouts
    └── js/
        └── app.js          # Client-side state and tweet composer logic
```

## ⚙️ Getting Started

### Prerequisites

*   Python 3.8 or higher installed on your system.

### Installation

1.  **Clone or navigate to the directory**:
    ```bash
    cd bq-release-notes
    ```

2.  **Set up a virtual environment**:
    ```bash
    python3 -m venv .venv
    ```

3.  **Activate the virtual environment**:
    *   On macOS/Linux:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows:
        ```bash
        .venv\Scripts\activate
        ```

4.  **Install the dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Application

Start the Flask server:
```bash
python app.py
```

By default, the application is configured to run on port **`8080`** (to avoid common macOS port 5000 conflicts with AirPlay Receiver). Open your browser and navigate to:

👉 **[http://localhost:8080](http://localhost:8080)**

## 📝 Usage Guide

1.  **Search & Filters**: Type keywords in the search bar or click on category pills (e.g. *Features*, *Issues*) to filter the timeline instantly.
2.  **Refresh Feed**: Click the **Refresh notes** button in the header. The spinner will run, making a live network call to fetch the latest feed, bypassing the cache.
3.  **Theme Toggle**: Click the sun/moon icon in the header to switch between light and dark themes.
4.  **Tweet Share**: Click **Tweet** on any specific update. A custom composer will slide open. Here you can edit the text, toggle whether to append the source permalink or hashtags (`#BigQuery #GCP`), review character limit markers, and click **Post on X** to open a pre-filled Web Intent tab on Twitter.
