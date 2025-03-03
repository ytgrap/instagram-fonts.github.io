document.addEventListener('DOMContentLoaded', function() {
    const urlForm = document.getElementById('url-form');
    const loadingSpinner = document.getElementById('loading');
    const videoInfo = document.getElementById('video-info');
    const errorMessage = document.getElementById('error-message');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoDuration = document.getElementById('video-duration');
    const formatList = document.getElementById('format-list');

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');

    // Check for saved theme preference or use device preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                       (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Apply the theme
    document.documentElement.classList.toggle('dark', isDarkMode);

    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const darkModeEnabled = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', darkModeEnabled);
    });

    if (urlForm) {
        urlForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const url = document.getElementById('url').value.trim();

            if (!url) {
                showError('Please enter a valid YouTube URL');
                return;
            }

            // Hide previous results and show loading
            videoInfo.classList.add('hidden');
            errorMessage.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');

            try {
                const formData = new FormData();
                formData.append('url', url);

                const response = await fetch('/fetch-info', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                loadingSpinner.classList.add('hidden');

                if (data.error) {
                    showError(data.error);
                    return;
                }

                // Display video info
                displayVideoInfo(data);
            } catch (error) {
                loadingSpinner.classList.add('hidden');
                showError('An error occurred. Please try again.');
                console.error(error);
            }
        });
    }

    function displayVideoInfo(data) {
        // Set thumbnail and title
        videoThumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;

        // Format and display duration
        const duration = formatDuration(data.duration);
        videoDuration.textContent = duration ? `Duration: ${duration}` : '';

        // Clear previous format list
        formatList.innerHTML = '';

        // Add format options
        if (data.formats && data.formats.length > 0) {
            data.formats.forEach(format => {
                const formatButton = createFormatElement(format, data.title, data.url);
                formatList.appendChild(formatButton);
            });
        } else {
            const noFormats = document.createElement('p');
            noFormats.className = 'text-gray-600 dark:text-gray-400';
            noFormats.textContent = 'No formats available for this video.';
            formatList.appendChild(noFormats);
        }

        // Show video info section
        videoInfo.classList.remove('hidden');
    }


    function createFormatElement(format, videoTitle, videoUrl) {
        const formatItem = document.createElement('div');
        formatItem.className = 'flex flex-wrap justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';

        const formatInfo = document.createElement('div');
        formatInfo.className = 'flex items-center';

        const qualityBadge = document.createElement('span');
        qualityBadge.className = 'px-2 py-1 mr-3 bg-red-600 text-white text-xs font-bold rounded';
        qualityBadge.textContent = format.quality;

        const formatDetails = document.createElement('span');
        formatDetails.className = 'text-gray-800 dark:text-gray-200';
        formatDetails.textContent = `${format.extension.toUpperCase()} · ${formatFileSize(format.filesize)}`;

        formatInfo.appendChild(qualityBadge);
        formatInfo.appendChild(formatDetails);

        const downloadButton = document.createElement('button');
        downloadButton.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center';

        // Add download icon to match the image
        const downloadIcon = document.createElement('span');
        downloadIcon.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>`;

        downloadButton.appendChild(downloadIcon);
        downloadButton.appendChild(document.createTextNode('DOWNLOAD'));

        downloadButton.addEventListener('click', function() {
            downloadVideo(videoUrl, format.format_id, videoTitle);
        });

        formatItem.appendChild(formatInfo);
        formatItem.appendChild(downloadButton);

        return formatItem;
    }

    function downloadVideo(url, formatId, videoTitle) {
        // Create a form to submit the download request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/download';

        // URL input
        const urlInput = document.createElement('input');
        urlInput.type = 'hidden';
        urlInput.name = 'url';
        urlInput.value = url;

        // Format input
        const formatInput = document.createElement('input');
        formatInput.type = 'hidden';
        formatInput.name = 'format';
        formatInput.value = formatId;

        // Video Title input (added for potential server-side use)
        const titleInput = document.createElement('input');
        titleInput.type = 'hidden';
        titleInput.name = 'title';
        titleInput.value = videoTitle;


        form.appendChild(urlInput);
        form.appendChild(formatInput);
        form.appendChild(titleInput);
        document.body.appendChild(form);

        form.submit();
        document.body.removeChild(form);
    }

    function showError(message) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function formatDuration(seconds) {
        if (!seconds) return null;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        let result = '';

        if (hours > 0) {
            result += `${hours}:`;
            result += `${minutes < 10 ? '0' : ''}${minutes}:`;
        } else {
            result += `${minutes}:`;
        }

        result += `${secs < 10 ? '0' : ''}${secs}`;

        return result;
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
});