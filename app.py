import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple in-memory cache
cache = {
    "data": None,
    "last_updated": None
}

def parse_html_content(html_content):
    """
    Parses the CDATA HTML content from Google's feed.
    Each entry typically contains multiple h3 headings (Feature, Issue, Deprecation, etc.)
    followed by paragraphs or lists describing the updates.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    updates = []
    
    headings = soup.find_all('h3')
    if not headings:
        # Fallback: if there are no h3 headings, treat the whole content as one update
        text_content = soup.get_text().strip()
        return [{
            "category": "Update",
            "html": str(soup),
            "text": text_content
        }]
    
    # Check if there is text before the first h3 (unusual, but good for robustness)
    first_heading = headings[0]
    before_parts = []
    sibling = first_heading.previous_sibling
    while sibling:
        before_parts.insert(0, sibling)
        sibling = sibling.previous_sibling
    
    if before_parts:
        before_html = "".join(str(s) for s in before_parts)
        before_soup = BeautifulSoup(before_html, 'html.parser')
        before_text = before_soup.get_text().strip()
        if before_text:
            updates.append({
                "category": "General",
                "html": before_html,
                "text": before_text
            })
            
    # Iterate through all headings and extract siblings until the next heading
    for heading in headings:
        category = heading.get_text().strip()
        content_parts = []
        sibling = heading.next_sibling
        
        while sibling and sibling.name != 'h3':
            content_parts.append(sibling)
            sibling = sibling.next_sibling
            
        html_str = "".join(str(s) for s in content_parts)
        sub_soup = BeautifulSoup(html_str, 'html.parser')
        text_str = sub_soup.get_text().strip()
        
        updates.append({
            "category": category,
            "html": html_str,
            "text": text_str
        })
        
    return updates

def fetch_and_parse_feed():
    """Fetches the XML feed and parses it into structured data."""
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        parsed_entries = []
        
        for entry in feed.entries:
            # Entry date parsing
            # entry.updated or entry.title is typically the date
            date_str = entry.title
            
            # Content fetching
            content_html = ""
            if "content" in entry and entry.content:
                content_html = entry.content[0].value
            elif "summary" in entry:
                content_html = entry.summary
                
            # Parse individual updates from the HTML content
            updates = parse_html_content(content_html)
            
            # Create a permalink
            link = entry.link if "link" in entry else "https://cloud.google.com/bigquery/docs/release-notes"
            
            parsed_entries.append({
                "id": entry.id if "id" in entry else date_str,
                "date": date_str,
                "raw_date": entry.updated if "updated" in entry else "",
                "link": link,
                "updates": updates
            })
            
        return parsed_entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Return from cache if available and not force refresh
    if cache["data"] is not None and not force_refresh:
        return jsonify({
            "success": True,
            "source": "cache",
            "data": cache["data"]
        })
        
    data, error = fetch_and_parse_feed()
    if error:
        # If fetching fails but we have cached data, return the cached data with a warning
        if cache["data"] is not None:
            return jsonify({
                "success": True,
                "source": "cache_fallback",
                "warning": f"Could not refresh feed: {error}",
                "data": cache["data"]
            })
        return jsonify({
            "success": False,
            "error": f"Failed to fetch release notes: {error}"
        }), 500
        
    # Update cache
    cache["data"] = data
    return jsonify({
        "success": True,
        "source": "live",
        "data": data
    })

if __name__ == '__main__':
    # Bind to port 8080 by default
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
