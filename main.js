document.addEventListener('DOMContentLoaded', function() {
    const urlForm = document.getElementById('url-form');
    const loading = document.getElementById('loading');
    const videoInfo = document.getElementById('video-info');
    const errorMessage = document.getElementById('error-message');
    const themeToggle = document.getElementById('theme-toggle');
    let currentVideoUrl = '';

    // Theme toggle functionality with localStorage persistence
    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.theme = theme;
    }

    // Initial theme setup
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'light' : 'dark');
    });

    urlForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const url = document.getElementById('url').value;
        currentVideoUrl = url;

        loading.classList.remove('hidden');
        videoInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch('/fetch-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `url=${encodeURIComponent(url)}`
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch video info');
            }

            displayVideoInfo(data);
        } catch (error) {
            showError(error.message);
        } finally {
            loading.classList.add('hidden');
        }
    });

    function displayVideoInfo(data) {
        const formatList = document.getElementById('format-list');
        formatList.innerHTML = '';

        if (data.formats.length === 0) {
            formatList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No download formats available.</p>';
            return;
        }

        data.formats.forEach(format => {
            const container = document.createElement('div');
            container.className = 'format-container bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-3';

            container.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <span class="text-lg font-medium text-gray-900 dark:text-white">${format.resolution}</span>
                        <span class="text-sm px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">MP4</span>
                        <span class="text-sm text-gray-500">${formatFileSize(format.filesize)}</span>
                    </div>
                    <button class="download-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        DOWNLOAD
                    </button>
                </div>
            `;

            const downloadBtn = container.querySelector('.download-btn');
            // Store video title as a data attribute on the button
            downloadBtn.setAttribute('data-video-title', data.title);
            downloadBtn.addEventListener('click', async () => {
                try {
                    downloadBtn.disabled = true;
                    downloadBtn.classList.add('opacity-50');

                    const formData = new FormData();
                    formData.append('url', currentVideoUrl);
                    formData.append('format', format.format_id);

                    const response = await fetch('/download', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Failed to download video');
                    }

                    // Create a blob from the response and trigger download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);

                    // Get the filename from the Content-Disposition header if available
                    let filename = '';
                    const contentDisposition = response.headers.get('Content-Disposition');
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                        if (filenameMatch) {
                            filename = filenameMatch[1];
                        }
                    }

                    // If no filename found in headers, use the video title
                    if (!filename) {
                        filename = `${data.title || 'video'}.${format.ext}`;
                        // Remove invalid filename characters
                        filename = filename.replace(/[/\\?%*:|"<>]/g, '-');
                    }

                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } catch (error) {
                    showError(error.message);
                } finally {
                    downloadBtn.disabled = false;
                    downloadBtn.classList.remove('opacity-50');
                }
            });
            formatList.appendChild(container);
        });

        videoInfo.classList.remove('hidden');
        videoInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showError(message) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.classList.remove('hidden');
        videoInfo.classList.add('hidden');
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const urlForm = document.getElementById('url-form');
    const loadingSpinner = document.getElementById('loading');
    const videoInfo = document.getElementById('video-info');
    const errorMessage = document.getElementById('error-message');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoDuration = document.getElementById('video-duration');
    const formatList = document.getElementById('format-list');

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

                if (response.ok) {
                    displayVideoInfo(data);
                } else {
                    showError(data.error || 'An error occurred');
                }
            } catch (error) {
                showError('An error occurred while fetching video information');
                console.error(error);
            } finally {
                loadingSpinner.classList.add('hidden');
            }
        });
    }

    function displayVideoInfo(data) {
        // Set thumbnail
        if (videoThumbnail) {
            videoThumbnail.src = data.thumbnail || '';
            videoThumbnail.alt = data.title || 'Video thumbnail';
        }

        // Set title
        if (videoTitle) {
            videoTitle.textContent = data.title || 'Unknown Title';
        }

        // Set duration
        if (videoDuration && data.duration) {
            videoDuration.textContent = `Duration: ${formatDuration(data.duration)}`;
        }

        // Clear previous formats
        if (formatList) {
            formatList.innerHTML = '';

            // Add formats
            if (data.formats && data.formats.length > 0) {
                data.formats.forEach(format => {
                    const container = document.createElement('div');
                    container.className = 'bg-gray-50 dark:bg-gray-700 rounded-lg p-4';

                    container.innerHTML = `
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <span class="text-lg font-medium text-gray-900 dark:text-white">${format.resolution}</span>
                                <span class="text-sm px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">MP4</span>
                                <span class="text-sm text-gray-500">${formatFileSize(format.filesize)}</span>
                            </div>
                            <button class="download-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                DOWNLOAD
                            </button>
                        </div>
                    `;

                    const downloadBtn = container.querySelector('.download-btn');
                    // Store video title as a data attribute on the button
                    downloadBtn.setAttribute('data-video-title', data.title);
                    downloadBtn.addEventListener('click', async () => {
                        try {
                            downloadBtn.disabled = true;
                            downloadBtn.classList.add('opacity-50');
                            downloadBtn.textContent = 'Downloading...';

                            const formData = new FormData();
                            formData.append('url', document.getElementById('url').value.trim());
                            formData.append('format', format.format_id);

                            const response = await fetch('/download', {
                                method: 'POST',
                                body: formData
                            });

                            if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;

                                // Try to get filename from Content-Disposition header
                                const contentDisposition = response.headers.get('Content-Disposition');
                                let filename = 'video.mp4';

                                if (contentDisposition) {
                                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                                    if (filenameMatch && filenameMatch[1]) {
                                        filename = filenameMatch[1];
                                    }
                                } else {
                                    // Use video title if available
                                    filename = `${data.title || 'video'}.mp4`;
                                }

                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } else {
                                const errorData = await response.json();
                                showError(errorData.error || 'Failed to download video');
                            }
                        } catch (error) {
                            showError('An error occurred during download');
                            console.error(error);
                        } finally {
                            downloadBtn.disabled = false;
                            downloadBtn.classList.remove('opacity-50');
                            downloadBtn.innerHTML = `
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                DOWNLOAD
                            `;
                        }
                    });

                    formatList.appendChild(container);
                });
            } else {
                const noFormatsMsg = document.createElement('p');
                noFormatsMsg.className = 'text-gray-600 dark:text-gray-400';
                noFormatsMsg.textContent = 'No downloadable formats available for this video';
                formatList.appendChild(noFormatsMsg);
            }
        }

        videoInfo.classList.remove('hidden');
        videoInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showError(message) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.classList.remove('hidden');
        videoInfo.classList.add('hidden');
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
});
// Dark/Light mode toggle
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Handle URL form submission
    const urlForm = document.getElementById('url-form');
    const loading = document.getElementById('loading');
    const videoInfo = document.getElementById('video-info');
    const errorMessage = document.getElementById('error-message');
    
    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('url').value.trim();
        if (!url) return;
        
        // Show loading spinner
        loading.classList.remove('hidden');
        videoInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        try {
            const response = await fetch('/fetch-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `url=${encodeURIComponent(url)}`
            });
            
            const data = await response.json();
            
            if (response.ok) {
                displayVideoInfo(data);
                videoInfo.classList.remove('hidden');
            } else {
                showError(data.error || 'Failed to fetch video info');
            }
        } catch (error) {
            showError('Network error. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    });
    
    function displayVideoInfo(data) {
        const thumbnail = document.getElementById('video-thumbnail');
        const title = document.getElementById('video-title');
        const duration = document.getElementById('video-duration');
        const formatList = document.getElementById('format-list');
        
        thumbnail.src = data.thumbnail;
        title.textContent = data.title;
        duration.textContent = `Duration: ${data.duration}`;
        
        // Clear previous formats
        formatList.innerHTML = '';
        
        // Add formats
        data.formats.forEach(format => {
            const formatButton = document.createElement('div');
            formatButton.className = 'format-button mb-3 relative';
            
            // Use Flexbox for better mobile layout
            formatButton.innerHTML = `
                <div class="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <div class="format-info flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span class="text-base font-medium text-gray-900 dark:text-white">${format.quality}</span>
                        <span class="format-quality">${format.resolution}</span>
                        <span class="format-size">${format.size}</span>
                    </div>
                    <form action="/download" method="post" class="w-full sm:w-auto">
                        <input type="hidden" name="url" value="${url}">
                        <input type="hidden" name="format" value="${format.format_id}">
                        <button type="submit" class="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            DOWNLOAD
                        </button>
                    </form>
                </div>
            `;
            
            formatList.appendChild(formatButton);
        });
    }
    
    function showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.querySelector('span').textContent = message;
        errorElement.classList.remove('hidden');
    }
});
