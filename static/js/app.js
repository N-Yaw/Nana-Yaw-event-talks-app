// Application State
let appState = {
    allEntries: [],
    filteredEntries: [],
    currentFilter: 'all',
    searchQuery: '',
    lastFetched: null,
    selectedUpdate: null,
    readUpdates: new Set(),
    collapsedDays: new Set()
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const searchClearBtn = document.getElementById('search-clear-btn');
const resetTweetBtn = document.getElementById('reset-tweet-btn');
const backToTopBtn = document.getElementById('back-to-top-btn');
const lastSyncTime = document.getElementById('last-sync-time');
const searchInput = document.getElementById('search-input');
const filterPillsContainer = document.getElementById('filter-pills-container');
const feedLoading = document.getElementById('feed-loading');
const feedError = document.getElementById('feed-error');
const feedEmpty = document.getElementById('feed-empty');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const releaseFeed = document.getElementById('release-feed');

// Stats Elements
const statDays = document.getElementById('stat-days');
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');

// Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const composerTypeBadge = document.getElementById('composer-type-badge');
const composerDate = document.getElementById('composer-date');
const composerSourceText = document.getElementById('composer-source-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgress = document.getElementById('char-progress');
const charCount = document.getElementById('char-count');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');

// Toast Element
const toastContainer = document.getElementById('toast-container');

// Progress Circle Circumference (r=14 -> 2 * PI * 14 = 87.96)
const PROGRESS_CIRCUMFERENCE = 88;

// Initialize App
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });
} else {
    initApp();
}

function initApp() {
    // Load saved theme or system preference
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    // Listen for system theme changes (applies only if user hasn't overridden manually)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'light' : 'dark');
        }
    });

    // Load saved read updates state
    try {
        const savedRead = JSON.parse(localStorage.getItem('readUpdates') || '[]');
        appState.readUpdates = new Set(savedRead);
    } catch (e) {
        appState.readUpdates = new Set();
    }
    appState.collapsedDays = new Set();

    // Set up progress circle
    charProgress.style.strokeDasharray = `${PROGRESS_CIRCUMFERENCE} ${PROGRESS_CIRCUMFERENCE}`;
    charProgress.style.strokeDashoffset = PROGRESS_CIRCUMFERENCE;

    // Load initial data
    fetchReleaseNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggleBtn.addEventListener('click', toggleTheme);
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        appState.searchQuery = '';
        searchInput.parentElement.classList.remove('search-input-active');
        searchClearBtn.classList.add('hidden');
        filterAndRender();
    });
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    clearFiltersBtn.addEventListener('click', clearFilters);
    resetTweetBtn.addEventListener('click', resetTweetDraft);

    // Back to top scroll listener
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.trim().toLowerCase();
        
        const wrapper = searchInput.parentElement;
        if (appState.searchQuery) {
            wrapper.classList.add('search-input-active');
            searchClearBtn.classList.remove('hidden');
        } else {
            wrapper.classList.remove('search-input-active');
            searchClearBtn.classList.add('hidden');
        }
        
        filterAndRender();
    });

    filterPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;

        // Update active pill UI
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        // Update state and filter
        appState.currentFilter = pill.dataset.filter;
        filterAndRender();
    });

    // Drawer Event Listeners
    closeDrawerBtn.addEventListener('click', closeComposer);
    drawerOverlay.addEventListener('click', closeComposer);
    tweetTextarea.addEventListener('input', updateCharCounter);
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    submitTweetBtn.addEventListener('click', sendTweet);

    // Escape key closes drawer
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetDrawer.classList.contains('open')) {
            closeComposer();
        }
    });

    // Initialize Lucide Icons
    lucide.createIcons();
}

// Fetch Data from API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    showError(false);
    showEmpty(false);

    if (forceRefresh) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
    }

    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const json = await response.json();
        
        if (json.status === 'error') {
            throw new Error(json.message);
        }

        if (json.status === 'warning') {
            showToast(json.message, 'warning');
        }

        appState.allEntries = json.data.entries || [];
        appState.lastFetched = json.last_fetched;

        // Render Page
        updateSyncTime(json.last_fetched);
        filterAndRender();

        if (forceRefresh) {
            showToast('Release notes successfully refreshed!', 'success');
        }
    } catch (err) {
        console.error('Error fetching release notes:', err);
        showError(true, err.message);
        showToast('Failed to fetch release notes: ' + err.message, 'error');
    } finally {
        showLoading(false);
        if (forceRefresh) {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }
}

// Calculate Global Stats and Filtered Stats
function calculateStats() {
    const totalEntries = appState.allEntries.length;
    const filteredEntries = appState.filteredEntries.length;
    
    let totalUpdates = 0;
    let totalFeatures = 0;
    let totalIssues = 0;
    
    appState.allEntries.forEach(entry => {
        const updates = entry.updates || [];
        totalUpdates += updates.length;
        updates.forEach(upd => {
            if (upd.type === 'Feature') totalFeatures++;
            else if (upd.type === 'Issue' || upd.type === 'Deprecation') totalIssues++;
        });
    });

    let filteredUpdates = 0;
    let filteredFeatures = 0;
    let filteredIssues = 0;
    
    appState.filteredEntries.forEach(entry => {
        const updates = entry.updates || [];
        filteredUpdates += updates.length;
        updates.forEach(upd => {
            if (upd.type === 'Feature') filteredFeatures++;
            else if (upd.type === 'Issue' || upd.type === 'Deprecation') filteredIssues++;
        });
    });

    const isFiltered = appState.currentFilter !== 'all' || appState.searchQuery !== '';

    statDays.textContent = isFiltered ? `${filteredEntries} / ${totalEntries}` : totalEntries;
    statTotal.textContent = isFiltered ? `${filteredUpdates} / ${totalUpdates}` : totalUpdates;
    statFeatures.textContent = isFiltered ? `${filteredFeatures} / ${totalFeatures}` : totalFeatures;
    statIssues.textContent = isFiltered ? `${filteredIssues} / ${totalIssues}` : totalIssues;
}

// Filter and Render Release Notes
function filterAndRender() {
    const query = appState.searchQuery;
    const filter = appState.currentFilter;
    
    // Reset filtered entries list
    appState.filteredEntries = [];

    appState.allEntries.forEach(entry => {
        const matchingUpdates = (entry.updates || []).filter(upd => {
            // Category check
            const matchesCategory = (filter === 'all' || upd.type === filter);
            
            // Search query check
            const matchesSearch = !query || 
                upd.type.toLowerCase().includes(query) || 
                upd.text_content.toLowerCase().includes(query);

            return matchesCategory && matchesSearch;
        });

        if (matchingUpdates.length > 0) {
            appState.filteredEntries.push({
                ...entry,
                updates: matchingUpdates
            });
        }
    });

    // Recalculate stats with the filtered set
    calculateStats();

    // Render feed
    renderFeed();
}

// Render the Feed Content
function renderFeed() {
    releaseFeed.innerHTML = '';
    
    if (appState.filteredEntries.length === 0) {
        showEmpty(true);
        return;
    }

    showEmpty(false);

    appState.filteredEntries.forEach(entry => {
        const isCollapsed = appState.collapsedDays.has(entry.id);
        const collapsedClass = isCollapsed ? 'collapsed' : '';

        const card = document.createElement('article');
        card.className = `release-day-card ${collapsedClass}`;
        card.id = `card-${entry.id.replace(/[^\w-]/g, '_')}`;

        const headerHtml = `
            <div class="release-day-header">
                <div class="release-day-title">
                    <button class="day-collapse-btn" data-entry-id="${entry.id}" title="${isCollapsed ? 'Expand day' : 'Collapse day'}">
                        <i data-lucide="chevron-down"></i>
                    </button>
                    <i data-lucide="calendar-days"></i>
                    <h2>${entry.date}</h2>
                </div>
                <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="release-day-link" title="Open official release notes">
                    <span>Source Notes</span>
                    <i data-lucide="external-link"></i>
                </a>
            </div>
        `;

        let updatesHtml = '<div class="updates-list">';
        entry.updates.forEach(upd => {
            let badgeClass = 'badge-general';
            if (upd.type === 'Feature') badgeClass = 'badge-feature';
            else if (upd.type === 'Issue') badgeClass = 'badge-issue';
            else if (upd.type === 'Deprecation') badgeClass = 'badge-deprecation';

            const isRead = appState.readUpdates.has(upd.id);
            const readClass = isRead ? 'is-read' : '';

            updatesHtml += `
                <div class="update-item ${readClass}" data-type="${upd.type}">
                    <div class="update-meta-row">
                        <span class="badge ${badgeClass}">${upd.type}</span>
                        <div class="update-actions-wrapper">
                            <button class="update-action-trigger read-toggle-trigger" data-update-id="${upd.id}" title="${isRead ? 'Mark as unread' : 'Mark as read'}">
                                <i data-lucide="${isRead ? 'eye-off' : 'eye'}"></i>
                                <span>${isRead ? 'Unread' : 'Read'}</span>
                            </button>
                            <button class="update-action-trigger copy-update-trigger" data-update-id="${upd.id}" title="Copy plain text update to clipboard">
                                <i data-lucide="copy"></i>
                                <span>Copy</span>
                            </button>
                            <button class="update-action-trigger tweet-update-trigger" data-update-id="${upd.id}" data-entry-date="${entry.date}" data-entry-link="${entry.link}" title="Draft a tweet for this update">
                                <i data-lucide="twitter"></i>
                                <span>Tweet</span>
                            </button>
                        </div>
                    </div>
                    <div class="update-body">
                        ${upd.html_content}
                    </div>
                </div>
            `;
        });
        updatesHtml += '</div>';

        card.innerHTML = headerHtml + updatesHtml;
        releaseFeed.appendChild(card);
    });

    // Bind Day Collapse buttons
    document.querySelectorAll('.day-collapse-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entryId = btn.dataset.entryId;
            const card = btn.closest('.release-day-card');
            const isCollapsed = card.classList.toggle('collapsed');
            
            if (isCollapsed) {
                appState.collapsedDays.add(entryId);
                btn.setAttribute('title', 'Expand day');
            } else {
                appState.collapsedDays.delete(entryId);
                btn.setAttribute('title', 'Collapse day');
            }
            
            // Re-create icons for the button
            lucide.createIcons();
        });
    });

    // Bind Read Toggle buttons
    document.querySelectorAll('.read-toggle-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = btn.dataset.updateId;
            toggleReadStatus(updateId);
        });
    });

    // Bind Tweet buttons
    document.querySelectorAll('.tweet-update-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = btn.dataset.updateId;
            const dateStr = btn.dataset.entryDate;
            const linkStr = btn.dataset.entryLink;
            openComposer(updateId, dateStr, linkStr);
        });
    });

    // Bind Copy buttons with visual success feedback
    document.querySelectorAll('.copy-update-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const updateId = btn.dataset.updateId;
            const success = await copyUpdateToClipboard(updateId);
            
            if (success) {
                btn.classList.add('copy-success');
                btn.innerHTML = `<i data-lucide="check"></i><span>Copied!</span>`;
                lucide.createIcons();
                
                setTimeout(() => {
                    btn.classList.remove('copy-success');
                    btn.innerHTML = `<i data-lucide="copy"></i><span>Copy</span>`;
                    lucide.createIcons();
                }, 2000);
            }
        });
    });

    // Re-create icons for dynamically added elements
    lucide.createIcons();
}

// Copy Specific Update Plain Text to Clipboard
async function copyUpdateToClipboard(updateId) {
    let foundUpdate = null;
    for (const entry of appState.allEntries) {
        foundUpdate = entry.updates.find(upd => upd.id === updateId);
        if (foundUpdate) break;
    }

    if (!foundUpdate) {
        showToast('Error copying content: Update not found', 'error');
        return false;
    }

    try {
        await navigator.clipboard.writeText(foundUpdate.text_content);
        showToast('Update copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
        return false;
    }
}

// Export Filtered Entries to CSV
function exportToCSV() {
    if (appState.filteredEntries.length === 0) {
        showToast('No entries available to export', 'warning');
        return;
    }

    const headers = ['Date', 'Type', 'Link', 'Content'];
    let csvRows = [headers.join(',')];

    appState.filteredEntries.forEach(entry => {
        entry.updates.forEach(upd => {
            const row = [
                escapeCSV(entry.date),
                escapeCSV(upd.type),
                escapeCSV(entry.link),
                escapeCSV(upd.text_content)
            ];
            csvRows.push(row.join(','));
        });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename based on active filters/search
    let filename = 'bigquery_release_notes';
    if (appState.currentFilter !== 'all') {
        filename += `_${appState.currentFilter.toLowerCase()}`;
    }
    if (appState.searchQuery) {
        filename += `_filtered`;
    }
    filename += '.csv';

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported CSV as: ${filename}`, 'success');
}

function escapeCSV(text) {
    if (!text) return '""';
    return `"${text.replace(/"/g, '""')}"`;
}

// Open Tweet Composer Drawer
function openComposer(updateId, dateStr, linkStr) {
    // Find the update in all entries
    let foundUpdate = null;
    for (const entry of appState.allEntries) {
        foundUpdate = entry.updates.find(upd => upd.id === updateId);
        if (foundUpdate) break;
    }

    if (!foundUpdate) {
        showToast('Error opening composer: Update not found', 'error');
        return;
    }

    appState.selectedUpdate = {
        ...foundUpdate,
        date: dateStr,
        link: linkStr
    };

    // Update Composer details
    composerTypeBadge.className = 'badge';
    if (foundUpdate.type === 'Feature') composerTypeBadge.classList.add('badge-feature');
    else if (foundUpdate.type === 'Issue') composerTypeBadge.classList.add('badge-issue');
    else if (foundUpdate.type === 'Deprecation') composerTypeBadge.classList.add('badge-deprecation');
    else composerTypeBadge.classList.add('badge-general');
    
    composerTypeBadge.textContent = foundUpdate.type;
    composerDate.textContent = dateStr;
    composerSourceText.innerHTML = foundUpdate.html_content;

    // Generate Tweet Draft
    const tweetText = generateTweetDraft(foundUpdate, dateStr, linkStr);
    tweetTextarea.value = tweetText;

    // Save default draft text for reset functionality
    appState.selectedUpdate.defaultDraftText = tweetText;

    // Show Drawer
    tweetDrawer.classList.add('open');
    document.body.style.overflow = 'hidden'; // Lock background scroll

    // Update character counter
    updateCharCounter();
}

// Reset Composer Draft
function resetTweetDraft() {
    if (!appState.selectedUpdate) return;
    
    const defaultText = appState.selectedUpdate.defaultDraftText || 
        generateTweetDraft(appState.selectedUpdate, appState.selectedUpdate.date, appState.selectedUpdate.link);
        
    tweetTextarea.value = defaultText;
    updateCharCounter();
    showToast('Tweet draft reset!', 'info');
}

// Toggle Read/Unread Status of an Update
function toggleReadStatus(updateId) {
    if (appState.readUpdates.has(updateId)) {
        appState.readUpdates.delete(updateId);
        showToast('Marked as unread', 'info');
    } else {
        appState.readUpdates.add(updateId);
        showToast('Marked as read', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('readUpdates', JSON.stringify(Array.from(appState.readUpdates)));
    
    // Re-render feed and recalculate stats
    filterAndRender();
}

// Close Tweet Composer Drawer
function closeComposer() {
    tweetDrawer.classList.remove('open');
    document.body.style.overflow = ''; // Release scroll lock
    tweetTextarea.value = ''; // Clear textarea on close
    appState.selectedUpdate = null;
}

// Generate Tweet Draft with smart character limit checks
function generateTweetDraft(update, date, link) {
    const tag = update.type === 'Feature' ? '🚀' : (update.type === 'Issue' ? '⚠️' : '📢');
    const header = `BigQuery Update ${tag} [${update.type}] (${date}):\n\n`;
    
    // Target Twitter URL is truncated automatically to 23 chars, but we keep the full string length for safety in calculations
    const urlText = `\n\nRead more: ${link}`;
    
    // Max characters on X is 280
    // Twitter counts URL as 23 characters
    const urlLengthInTwitter = 23 + 13; // URL (23) + "\n\nRead more: " (13)
    const headerLength = header.length;
    
    const maxTextLength = 280 - headerLength - urlLengthInTwitter - 5; // 5 characters safety margin
    
    let text = update.text_content;
    if (text.length > maxTextLength) {
        text = text.substring(0, maxTextLength - 3) + '...';
    }

    return `${header}${text}${urlText}`;
}

// Update Character Count and Progress Ring
function updateCharCounter() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    // Display character count
    charCount.textContent = 280 - len;

    // Calculate progress (out of 280 characters)
    const percent = Math.min((len / 280) * 100, 100);
    const offset = PROGRESS_CIRCUMFERENCE - (percent / 100) * PROGRESS_CIRCUMFERENCE;
    charProgress.style.strokeDashoffset = offset;

    // Highlight and status validation
    if (len > 280) {
        charCount.className = 'char-count-text char-count-error';
        charProgress.setAttribute('stroke', '#f43f5e'); // Rose color
        submitTweetBtn.disabled = true;
        submitTweetBtn.style.opacity = '0.5';
    } else if (len >= 260) {
        charCount.className = 'char-count-text char-count-warning';
        charProgress.setAttribute('stroke', '#f59e0b'); // Amber color
        submitTweetBtn.disabled = false;
        submitTweetBtn.style.opacity = '1';
    } else {
        charCount.className = 'char-count-text';
        charProgress.setAttribute('stroke', '#38bdf8'); // Sky blue color
        submitTweetBtn.disabled = false;
        submitTweetBtn.style.opacity = '1';
    }
}

// Copy Tweet Text to Clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Tweet copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

// Open Twitter Web Intent
function sendTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet exceeds 280 character limit!', 'error');
        return;
    }
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Close composer drawer
    closeComposer();
    showToast('Redirected to Twitter Web Intent!', 'success');
}

// Clear Filters
function clearFilters() {
    searchInput.value = '';
    appState.searchQuery = '';
    searchInput.parentElement.classList.remove('search-input-active');

    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-pill[data-filter="all"]').classList.add('active');
    appState.currentFilter = 'all';

    filterAndRender();
}

// Helper: Show/Hide Loading
function showLoading(show) {
    if (show) {
        feedLoading.classList.remove('hidden');
    } else {
        feedLoading.classList.add('hidden');
    }
}

// Helper: Show/Hide Error
function showError(show, message = '') {
    if (show) {
        feedError.classList.remove('hidden');
        errorMessage.textContent = message;
    } else {
        feedError.classList.add('hidden');
    }
}

// Helper: Show/Hide Empty State
function showEmpty(show) {
    if (show) {
        feedEmpty.classList.remove('hidden');
    } else {
        feedEmpty.classList.add('hidden');
    }
}

// Helper: Format and Update Sync Time
function updateSyncTime(isoString) {
    if (!isoString) {
        lastSyncTime.textContent = 'Never';
        return;
    }

    try {
        const date = new Date(isoString);
        // Format nicely
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        };
        const timeStr = date.toLocaleTimeString(undefined, options);
        lastSyncTime.textContent = `Synced at ${timeStr}`;
    } catch (e) {
        lastSyncTime.textContent = isoString;
    }
}

// Show Toast Alerts
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    else if (type === 'error') iconName = 'alert-circle';
    else if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    lucide.createIcons();

    // Remove toast after 4s (animation runs for 4s total)
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Theme Helper Functions
function getInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    
    // Fall back to system preference
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleIcon.setAttribute('data-lucide', 'moon');
    } else {
        document.body.classList.remove('light-theme');
        themeToggleIcon.setAttribute('data-lucide', 'sun');
    }
    // Re-render Lucide icons for the toggle button
    if (window.lucide) {
        lucide.createIcons();
    }
}

function toggleTheme() {
    const isCurrentlyLight = document.body.classList.contains('light-theme');
    const newTheme = isCurrentlyLight ? 'dark' : 'light';
    
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    showToast(`Swapped to ${newTheme === 'light' ? 'Light' : 'Dark'} Theme`, 'info');
}
