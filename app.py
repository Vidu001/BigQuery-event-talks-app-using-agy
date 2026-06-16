import re
import html
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Cache variables
release_notes_cache = None
cache_timestamp = 0
CACHE_DURATION = 600  # 10 minutes cache duration in seconds

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_content):
    """
    Remove HTML tags and clean up whitespace to get plain text for tweeting.
    """
    # Remove script and style elements (shouldn't be in feed but safe)
    text = re.sub(r'<(script|style).*?>.*?</\1>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    # Replace common block elements with spaces or newlines to preserve separation
    text = re.sub(r'</?(p|div|h1|h2|h3|h4|h5|h6|li|tr).*?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Clean up whitespace
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join([line for line in lines if line])
    # Collapse multiple spaces into a single space
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def fetch_and_parse_feed():
    """
    Fetch release notes Atom feed and parse into structured updates.
    """
    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_updates = []
    
    # Counter for generating unique client-side IDs
    index = 0
    
    for entry in root.findall('atom:entry', ns):
        date_str = entry.find('atom:title', ns).text
        updated_date = entry.find('atom:updated', ns).text
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        link_elem = entry.find('atom:link', ns)
        base_link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        # Split content_html by <h3> tags
        pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=\s*<h3>|$)', re.DOTALL | re.IGNORECASE)
        matches = pattern.findall(content_html)
        
        if not matches:
            # Fallback if no <h3> tags found
            text_desc = clean_html_to_text(content_html)
            parsed_updates.append({
                'id': f"note_{index}",
                'date': date_str,
                'type': 'General',
                'description_html': content_html,
                'description_text': text_desc,
                'link': base_link
            })
            index += 1
        else:
            for item_type, item_content in matches:
                item_content = item_content.strip()
                text_desc = clean_html_to_text(item_content)
                
                # Check for anchor tag specific link inside the section if any (for linking directly)
                # Google feeds often include anchor links like #June_15_2026.
                # If we want a specific link, we can append target id if found.
                parsed_updates.append({
                    'id': f"note_{index}",
                    'date': date_str,
                    'type': item_type.strip(),
                    'description_html': item_content,
                    'description_text': text_desc,
                    'link': base_link
                })
                index += 1
                
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global release_notes_cache, cache_timestamp
    
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or release_notes_cache is None or (current_time - cache_timestamp > CACHE_DURATION):
        try:
            release_notes_cache = fetch_and_parse_feed()
            cache_timestamp = current_time
            return jsonify({
                'success': True,
                'source': 'network',
                'timestamp': cache_timestamp,
                'data': release_notes_cache
            })
        except Exception as e:
            # If network request fails but we have cached data, return it with a warning
            if release_notes_cache is not None:
                return jsonify({
                    'success': True,
                    'source': 'cache_fallback',
                    'error': str(e),
                    'timestamp': cache_timestamp,
                    'data': release_notes_cache
                })
            return jsonify({
                'success': False,
                'error': f"Failed to fetch release notes: {str(e)}"
            }), 500
            
    return jsonify({
        'success': True,
        'source': 'cache',
        'timestamp': cache_timestamp,
        'data': release_notes_cache
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
