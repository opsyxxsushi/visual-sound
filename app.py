from flask import Flask, request, send_file, render_template, jsonify, make_response
import yt_dlp
import os
import uuid
import re

app = Flask(__name__, static_folder='static', template_folder='templates')

DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

def clean_filename(title):
    # Remove filesystem-invalid characters
    title = re.sub(r'[\\/*?:"<>|]', "", title)
    # Remove non-ASCII characters specifically for the HTTP Header
    return title.encode('ascii', 'ignore').decode('ascii').strip()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    unique_id = str(uuid.uuid4())[:8]
    ydl_opts = {
        # Allow it to grab the best available even if it's not 320kbps
        'format': 'bestaudio/best',
        'outtmpl': f'{DOWNLOAD_FOLDER}/%(title)s_{unique_id}.%(ext)s',
        'cookiefile': 'cookies.txt',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192', # 192 is safer and still high quality
        }],
        'noplaylist': True,
        # Add these new flags to help bypass the PO Token issue
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_title = info.get('title', 'audio')
            thumbnail = info.get('thumbnail', '')
            
            # Use ASCII-only title for the header to prevent Latin-1 crash
            header_title = clean_filename(video_title)
            if not header_title:
                header_title = "downloaded_audio"
            
            expected_filename = ydl.prepare_filename(info).rsplit('.', 1)[0] + ".mp3"
            
            response = make_response(send_file(expected_filename, as_attachment=True))
            
            # EXPOSE HEADERS FOR JS
            response.headers["Access-Control-Expose-Headers"] = "X-File-Name, X-Thumbnail"
            
            duration = info.get('duration', 0)

            minutes = duration // 60
            seconds = duration % 60
            duration_str = f"{minutes}:{seconds:02d}"

            response.headers["X-Duration"] = duration_str
            response.headers["Access-Control-Expose-Headers"] = "X-File-Name, X-Thumbnail, X-Duration"


            # ASCII-safe title for the header
            response.headers["X-File-Name"] = f"{header_title}.mp3"
            response.headers["X-Thumbnail"] = thumbnail
            
            return response
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':

    app.run(debug=True, port=5000)


