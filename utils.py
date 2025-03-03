import os
import logging
import yt_dlp
from datetime import datetime
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create downloads directory if it doesn't exist
DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

def is_valid_youtube_url(url):
    try:
        parsed = urlparse(url)
        return parsed.netloc in ['www.youtube.com', 'youtube.com', 'youtu.be']
    except:
        return False

def format_file_size(bytes):
    """Format file size from bytes to human-readable format"""
    if bytes is None:
        return 'N/A'
    
    # Convert bytes to megabytes for easier reading
    size_mb = bytes / (1024 * 1024)
    
    if size_mb < 1:
        # Show in KB if less than 1 MB
        size_kb = bytes / 1024
        return f"{size_kb:.1f} KB"
    else:
        return f"{size_mb:.1f} MB"

def format_resolution(resolution):
    if not resolution or resolution == 'N/A':
        return 'N/A'
    try:
        if 'x' in resolution:
            height = resolution.split('x')[1]
            return f"{height}p"
        return resolution
    except:
        return resolution

def format_duration(seconds):
    """Format duration from seconds to MM:SS or HH:MM:SS"""
    if not seconds:
        return 'Unknown'
    
    try:
        seconds = int(float(seconds))
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes}:{seconds:02d}"
    except:
        return 'Unknown'

def get_video_info(url):
    """Fetch video information and available formats."""
    try:
        logger.info(f"Fetching info for URL: {url}")

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'format': 'best'
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # Prepare formats to return
        formats = []
        if 'formats' in info:
            # Filter for video formats
            video_formats = [
                f for f in info['formats'] 
                if f.get('vcodec', 'none') != 'none' and f.get('acodec', 'none') != 'none'
            ]

            # Get unique resolutions and pick the best format for each
            seen_heights = set()
            unique_formats = []

            # Sort by quality (height) in descending order
            video_formats.sort(key=lambda x: x.get('height', 0) or 0, reverse=True)

            for f in video_formats:
                height = f.get('height', 0)
                if height and height not in seen_heights and f.get('filesize'):
                    seen_heights.add(height)
                    unique_formats.append(f)
                    # Limit to 5 formats max
                    if len(unique_formats) >= 5:
                        break

            # Format the data
            for f in unique_formats:
                formats.append({
                    'format_id': f['format_id'],
                    'quality': f'{f.get("height", "?")}p',
                    'extension': f.get('ext', 'mp4'),
                    'filesize': f.get('filesize', 0),
                })

        result = {
            'title': info.get('title', 'Unknown Title'),
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'url': url,
            'formats': formats
        }

        logger.info(f"Successfully retrieved info for {url}")
        return result

    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        raise Exception(f"Error fetching video info: {str(e)}")

def download_video(url, format_id):
    """Download video with the specified format."""
    try:
        logger.info(f"Downloading video: {url} with format: {format_id}")

        # Create a timestamp for unique filenames
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Configure yt-dlp options with metadata to prevent false positives
        ydl_opts = {
            'format': format_id,
            'outtmpl': f'{DOWNLOAD_DIR}/%(title)s-{timestamp}.%(ext)s',
            'addmetadata': True,  # Add metadata to file
            'writethumbnail': False,  # Don't write thumbnail
            'quiet': False,  # Show progress
            'no_warnings': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info)

        # Get just the filename without the directory
        filename = os.path.basename(downloaded_file)

        return {
            'filepath': downloaded_file,
            'filename': filename
        }

    except Exception as e:
        logger.error(f"Error downloading video: {str(e)}")
        raise Exception(f"Error downloading video: {str(e)}")