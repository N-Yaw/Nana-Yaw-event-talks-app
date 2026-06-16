import datetime
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Global in-memory cache
feed_cache = {
    "data": None,
    "last_fetched": None
}

def parse_release_notes(feed_content):
    # Parse the XML string using feedparser
    feed = feedparser.parse(feed_content)
    
    entries = []
    
    for entry in feed.entries:
        date_str = entry.get('title', 'Unknown Date')
        link_str = entry.get('link', '')
        id_str = entry.get('id', '')
        updated_str = entry.get('updated', '')
        
        # Get the HTML summary content
        summary = entry.get('summary', '')
        soup = BeautifulSoup(summary, 'html.parser')
        
        updates = []
        current_type = None
        current_content = []
        
        # Parse the HTML children to separate updates by <h3> headings
        for child in soup.children:
            if child.name is None:
                text = child.strip() if hasattr(child, 'strip') else str(child).strip()
                if not text:
                    continue
            
            if child.name == 'h3':
                # Save previous update if exists
                if current_type and current_content:
                    html_content = "".join(str(c) for c in current_content).strip()
                    clean_soup = BeautifulSoup(html_content, 'html.parser')
                    text_content = ' '.join(clean_soup.get_text(separator=' ').split())
                    
                    updates.append({
                        "id": f"{id_str}_{len(updates)}",
                        "type": current_type,
                        "html_content": html_content,
                        "text_content": text_content
                    })
                current_type = child.get_text().strip()
                current_content = []
            else:
                if current_type:
                    current_content.append(child)
                else:
                    current_type = "General"
                    current_content.append(child)
                    
        # Append the last update
        if current_type and current_content:
            html_content = "".join(str(c) for c in current_content).strip()
            clean_soup = BeautifulSoup(html_content, 'html.parser')
            text_content = ' '.join(clean_soup.get_text(separator=' ').split())
            
            updates.append({
                "id": f"{id_str}_{len(updates)}",
                "type": current_type,
                "html_content": html_content,
                "text_content": text_content
            })
            
        entries.append({
            "date": date_str,
            "link": link_str,
            "id": id_str,
            "updated": updated_str,
            "updates": updates
        })
        
    return {
        "title": feed.feed.get('title', 'BigQuery - Release notes'),
        "link": feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
        "entries": entries
    }

def fetch_feed_data():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    return response.content

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    global feed_cache
    if force_refresh or not feed_cache["data"] or not feed_cache["last_fetched"]:
        try:
            feed_content = fetch_feed_data()
            parsed_data = parse_release_notes(feed_content)
            feed_cache["data"] = parsed_data
            feed_cache["last_fetched"] = datetime.datetime.utcnow().isoformat() + "Z"
        except Exception as e:
            # If we fail and have cached data, fall back to cache instead of crashing
            if feed_cache["data"]:
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to refresh, showing cached data: {str(e)}",
                    "last_fetched": feed_cache["last_fetched"],
                    "data": feed_cache["data"]
                })
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch release notes: {str(e)}"
            }), 500
            
    return jsonify({
        "status": "success",
        "last_fetched": feed_cache["last_fetched"],
        "data": feed_cache["data"]
    })

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(debug=True, port=5000)
