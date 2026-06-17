# BigQuery Release Notes Navigator 🚀

A premium, responsive, developer-centric dashboard built using **Python Flask** and **Vanilla Web technologies (HTML/CSS/JS)**. This application aggregates the official Google Cloud BigQuery Release Notes RSS feed, breaks unified daily entries down into granular, filterable cards, and features an interactive X (Twitter) Tweet Composer panel to quickly share updates.

---

## 🛠️ Main Features

*   **Granular Update Splitting**: Automatically parses a single day's XML entry (which might bundle multiple updates) into individual, category-specific note cards (Features, Changed, Issues, Deprecated).
*   **Aesthetic & Modern Theme**: Fully styled dark mode dashboard built with glassmorphism panels, glowing indicator borders, custom scrollbars, and colored category badges.
*   **Search & Filters**: Debounced instant search (filtering dates, tags, and text contents) alongside category tags (Feature, Changed, Issue, Deprecated) to instantly find what you need.
*   **Dual Sorting**: Toggle between viewing the newest updates first (default) or oldest first.
*   **Smart RSS Cache**: Flask backend caches parsed notes in-memory for 10 minutes to reduce page loading times and prevent Google rate limits. Includes a force-sync button on the header with a spinner indicator.
*   **Dynamic Tweet Composer**: Select any release card to launch the composer. Offers three customized presets (**Standard**, **Concise**, and **Hype**) and automatically truncates the update text to ensure the draft fits under Twitter/X's 280-character limit (counting URLs as 23 characters).
*   **One-Click Publishing**: Utilizes Twitter Web Intents to open the customized draft in a new browser tab ready to tweet, without requiring complex Twitter API tokens.

---

## 📂 Project Structure

```
├── app.py                   # Flask server, Atom feed parsing, HTML sanitization, caching
├── requirements.txt         # Project package requirements
├── .gitignore               # Excludes bytecode, venv, and IDE files
├── templates/
│   └── index.html           # Structure template for the web app
└── static/
    ├── css/
    │   └── style.css        # Custom CSS variables, responsive design, animations
    └── js/
        └── main.js          # Client-side filtering, sorting, state management, Tweet composer
```

---

## ⚡ Getting Started

### Prerequisites
*   Python 3.10 or higher
*   pip (Python package installer)

### Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Vidu001/BigQuery-event-talks-app-using-agy.git
    cd BigQuery-event-talks-app-using-agy
    ```

2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    ```

3.  **Activate the Virtual Environment**:
    *   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **Windows (Command Prompt)**:
        ```cmd
        .\venv\Scripts\activate.bat
        ```
    *   **macOS / Linux**:
        ```bash
        source venv/bin/activate
        ```

4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the application**:
    ```bash
    python app.py
    ```

6.  **Access the Dashboard**:
    Open your browser and navigate to **`http://127.0.0.1:5000`**

---

## 🔄 How the Data Flows

1.  **Request Dispatch**: The browser requests `/api/release-notes`.
2.  **Cache Evaluation**: The Flask backend evaluates if the memory cache is under 10 minutes old. If yes, it immediately returns the JSON payload.
3.  **Feed Fetch & Segmenting**: If the cache is expired (or the user clicks **Refresh**), Flask downloads the official Atom feed, splits the entries into distinct updates using regular expression lookaheads, sanitizes the HTML to create plain-text summaries, updates the cache, and sends the JSON payload.
4.  **UI Rendering**: JavaScript receives the payload, computes feed statistics, applies active query filters/sorts, and renders animated cards.
5.  **Sharing**: Selecting a card populates the composer, calculates text truncation limits, and prepares a Twitter/X intent link.
