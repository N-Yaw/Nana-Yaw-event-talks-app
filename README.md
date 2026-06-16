# BigQuery Release Pulse

A premium, modern web dashboard built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. The application fetches the official BigQuery XML release notes feed, parses and divides release notes into individual day-by-day updates, and provides a smart character-checked composer to share updates on X (Twitter).

---

## ✨ Features

- **Automated XML Parsing**: Automatically fetches and splits the Google Cloud BigQuery RSS/Atom XML feed into clean individual updates.
- **Glassmorphic Tech Aesthetic**: Designed with an ultra-premium dark theme, custom ambient glows, card-blur filters, dynamic gradients, and smooth drawer animations.
- **Live Search & Category Filters**: Filters updates instantly by keywords (e.g. *Gemini*, *SQL*, *JSON*) and categories (*Features*, *Issues*, *Deprecations*) on the client side without page reloads.
- **Overview Analytics Grid**: Real-time counter metrics tracking release days, total updates, and feature counts.
- **Smart Tweet Composer Drawer**:
  - Automatically formats structured update tweets (e.g. `BigQuery Update 🚀 [Feature] (Date): Description...`).
  - Monitors the **280-character limit** in real-time with an SVG circular progress ring and color warnings.
  - Exposes one-click **Copy** and **Tweet on X** (via Twitter Web Intent) sharing buttons.
- **Server Caching**: Implements in-memory data caching with a warning fallback that serves cached data if the Google Cloud feed server is unreachable.

---

## 📂 Project Structure

```text
├── app.py                  # Flask backend (RSS fetcher, HTML/XML parser, caching, API)
├── templates/
│   └── index.html          # Frontend HTML structure
├── static/
│   ├── css/
│   │   └── style.css       # Custom dark-theme stylesheet (glassmorphism, animations)
│   └── js/
│       └── app.js          # Client-side controller (asynchronous fetch, filters, composer)
├── .gitignore              # Configured Git tracking exclusions
└── README.md               # Project documentation
```

---

## 🛠️ Prerequisites

To run this project locally, you will need:
- **Python 3.10 or higher** installed on your system.

---

## 🚀 Installation & Local Setup

Follow these steps to set up and run the application locally:

### 1. Set Up a Virtual Environment
Navigate to the project directory and create a virtual environment to isolate the project dependencies:
```bash
python -m venv .venv
```

### 2. Activate the Virtual Environment
- **On Windows (PowerShell)**:
  ```powershell
  .venv\Scripts\activate
  ```
- **On Windows (Command Prompt)**:
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **On macOS/Linux**:
  ```bash
  source .venv/bin/activate
  ```

### 3. Install Dependencies
Install the required packages using pip:
```bash
pip install flask requests feedparser beautifulsoup4
```

### 4. Run the Application
Start the Flask development server:
```bash
python app.py
```

### 5. Access the Web App
Open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔗 Sharing Locally (LAN / Wi-Fi)

To allow someone on the same Wi-Fi network to view the web app from their device, modify the launch command at the bottom of `app.py`:

```python
# Change this:
app.run(debug=True, port=5000)

# To this:
app.run(debug=True, host='0.0.0.0', port=5000)
```

Find your local IP address (e.g., `192.168.1.15` via `ipconfig` on Windows) and share the URL: `http://<your-local-ip>:5000`.
