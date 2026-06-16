// ==========================================================================
// Application State
// ==========================================================================
const state = {
    releases: [],
    filteredReleases: [],
    activeCategory: 'all',
    searchQuery: '',
    selectedUpdate: null,
    theme: 'dark',
    includeLink: true,
    includeHashtags: true
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const elements = {
    body: document.body,
    themeToggle: document.getElementById('theme-toggle'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    exportBtn: document.getElementById('export-btn'),
    statusSource: document.getElementById('status-source'),
    statusTime: document.getElementById('status-time'),
    statusWarningContainer: document.getElementById('status-warning-container'),
    statusWarning: document.getElementById('status-warning'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryFilters: document.getElementById('category-filters'),
    timelineLoading: document.getElementById('timeline-loading'),
    timelineError: document.getElementById('timeline-error'),
    timelineEmpty: document.getElementById('timeline-empty'),
    timelineContent: document.getElementById('timeline-content'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    charLimitWarning: document.getElementById('char-limit-warning'),
    toggleLink: document.getElementById('toggle-link'),
    toggleHashtags: document.getElementById('toggle-hashtags'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    submitTweetBtn: document.getElementById('submit-tweet-btn'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadReleases(false);
    setupEventListeners();
});

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        state.theme = savedTheme;
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDark ? 'dark' : 'light';
    }
    applyTheme();
}

function applyTheme() {
    if (state.theme === 'dark') {
        elements.body.classList.add('dark-theme');
        elements.body.classList.remove('light-theme');
    } else {
        elements.body.classList.remove('dark-theme');
        elements.body.classList.add('light-theme');
    }
    localStorage.setItem('theme', state.theme);
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
}

// ==========================================================================
// Data Fetching & Sync
// ==========================================================================
async function loadReleases(forceRefresh = false) {
    showLoading();
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            state.releases = result.data;
            
            // Update status dashboard
            updateDashboard(result.source, result.warning);
            
            // Render the timeline
            filterAndRenderTimeline();
        } else {
            throw new Error(result.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function updateDashboard(source, warning) {
    // Format source string nicely
    let sourceText = 'Live Feed';
    if (source === 'cache') {
        sourceText = 'Cached';
    } else if (source === 'cache_fallback') {
        sourceText = 'Cached (Fallback)';
    }
    elements.statusSource.textContent = sourceText;
    
    // Format current time as last updated
    const now = new Date();
    elements.statusTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Warn user if cached fallback was triggered
    if (warning) {
        elements.statusWarning.textContent = warning;
        elements.statusWarningContainer.classList.remove('hidden');
    } else {
        elements.statusWarningContainer.classList.add('hidden');
    }
}

// ==========================================================================
// Loading States
// ==========================================================================
function showLoading() {
    elements.refreshSpinner.classList.add('spinning');
    elements.refreshBtn.disabled = true;
    
    elements.timelineContent.classList.add('hidden');
    elements.timelineError.classList.add('hidden');
    elements.timelineEmpty.classList.add('hidden');
    elements.timelineLoading.classList.remove('hidden');
}

function hideLoading() {
    elements.refreshSpinner.classList.remove('spinning');
    elements.refreshBtn.disabled = false;
    elements.timelineLoading.classList.add('hidden');
}

function showError(msg) {
    elements.errorMessage.textContent = msg;
    elements.timelineContent.classList.add('hidden');
    elements.timelineLoading.classList.add('hidden');
    elements.timelineEmpty.classList.add('hidden');
    elements.timelineError.classList.remove('hidden');
}

// ==========================================================================
// Filtering & Rendering
// ==========================================================================
function filterAndRenderTimeline() {
    const query = state.searchQuery.toLowerCase().trim();
    const activeCat = state.activeCategory.toLowerCase();
    
    const filtered = [];
    
    for (const dayEntry of state.releases) {
        const matchingUpdates = [];
        
        for (const update of dayEntry.updates) {
            // Category check
            const matchesCategory = (activeCat === 'all') || (update.category.toLowerCase() === activeCat);
            
            // Search query check
            const matchesSearch = !query || 
                update.category.toLowerCase().includes(query) || 
                update.text.toLowerCase().includes(query) ||
                dayEntry.date.toLowerCase().includes(query);
                
            if (matchesCategory && matchesSearch) {
                matchingUpdates.push(update);
            }
        }
        
        if (matchingUpdates.length > 0) {
            filtered.push({
                ...dayEntry,
                updates: matchingUpdates
            });
        }
    }
    
    state.filteredReleases = filtered;
    renderTimeline();
}

function renderTimeline() {
    elements.timelineContent.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.timelineContent.classList.add('hidden');
        elements.timelineEmpty.classList.remove('hidden');
        return;
    }
    
    elements.timelineEmpty.classList.add('hidden');
    elements.timelineError.classList.add('hidden');
    elements.timelineContent.classList.remove('hidden');
    
    state.filteredReleases.forEach((dayEntry, dayIndex) => {
        // Timeline Day Block
        const dayBlock = document.createElement('div');
        dayBlock.className = 'timeline-day-block';
        
        // Date Badge
        const dateBadge = document.createElement('div');
        dateBadge.className = 'timeline-date-badge';
        dateBadge.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${dayEntry.date}</span>
        `;
        dayBlock.appendChild(dateBadge);
        
        // Updates List Container
        const updatesList = document.createElement('div');
        updatesList.className = 'timeline-day-updates';
        
        dayEntry.updates.forEach((update, updateIndex) => {
            const card = document.createElement('article');
            card.className = 'update-card';
            
            // Header: Category & Actions
            const catBadgeClass = getCategoryBadgeClass(update.category);
            const headerRow = document.createElement('div');
            headerRow.className = 'category-badge-row';
            
            headerRow.innerHTML = `
                <span class="category-tag ${catBadgeClass}">
                    ${getCategoryIcon(update.category)}
                    ${update.category}
                </span>
                <div class="card-actions">
                    <button class="action-btn-small action-btn-copy" data-day="${dayIndex}" data-update="${updateIndex}" title="Copy description to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="action-btn-small action-btn-tweet" data-day="${dayIndex}" data-update="${updateIndex}" title="Share on Twitter/X">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                        Tweet
                    </button>
                </div>
            `;
            card.appendChild(headerRow);
            
            // Body: Rich Text HTML
            const desc = document.createElement('div');
            desc.className = 'update-description';
            desc.innerHTML = update.html;
            card.appendChild(desc);
            
            updatesList.appendChild(card);
        });
        
        dayBlock.appendChild(updatesList);
        elements.timelineContent.appendChild(dayBlock);
    });
}

function getCategoryBadgeClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return 'tag-feature';
    if (cat.includes('change') || cat.includes('update')) return 'tag-changed';
    if (cat.includes('issue') || cat.includes('fix')) return 'tag-issue';
    if (cat.includes('deprecat')) return 'tag-deprecated';
    return 'tag-general';
}

function getCategoryIcon(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) {
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7L12 12L22 7L12 2Z"></path><path d="M2 17L12 22L22 17M2 12L12 17L22 12"></path></svg>`;
    }
    if (cat.includes('change') || cat.includes('update')) {
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`;
    }
    if (cat.includes('issue') || cat.includes('fix')) {
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    if (cat.includes('deprecat')) {
        return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
    }
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
}

// ==========================================================================
// Event Listeners & Handlers
// ==========================================================================
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => loadReleases(true));
    
    // Export button
    elements.exportBtn.addEventListener('click', exportToCSV);
    
    // Retry button on error page
    elements.retryBtn.addEventListener('click', () => loadReleases(true));
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery) {
            elements.clearSearchBtn.classList.remove('hidden');
        } else {
            elements.clearSearchBtn.classList.add('hidden');
        }
        filterAndRenderTimeline();
    });
    
    // Clear search
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.classList.add('hidden');
        filterAndRenderTimeline();
    });
    
    // Category filter pills
    elements.categoryFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        elements.categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked pill
        pill.classList.add('active');
        
        // Set state and render
        state.activeCategory = pill.dataset.category;
        filterAndRenderTimeline();
    });
    
    // Document delegated click for card actions
    elements.timelineContent.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.action-btn-copy');
        const tweetBtn = e.target.closest('.action-btn-tweet');
        
        if (copyBtn) {
            const dayIdx = parseInt(copyBtn.dataset.day);
            const updateIdx = parseInt(copyBtn.dataset.update);
            copyUpdateText(dayIdx, updateIdx);
        } else if (tweetBtn) {
            const dayIdx = parseInt(tweetBtn.dataset.day);
            const updateIdx = parseInt(tweetBtn.dataset.update);
            openTweetModal(dayIdx, updateIdx);
        }
    });
    
    // Modal events
    elements.modalClose.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
    
    // Textarea input in Composer
    elements.tweetTextarea.addEventListener('input', () => {
        updateCharCount();
    });
    
    // Share option toggles
    elements.toggleLink.addEventListener('change', (e) => {
        state.includeLink = e.target.checked;
        regenerateTweetDraft();
    });
    
    elements.toggleHashtags.addEventListener('change', (e) => {
        state.includeHashtags = e.target.checked;
        regenerateTweetDraft();
    });
    
    // Copy Tweet button
    elements.copyTweetBtn.addEventListener('click', () => {
        copyToClipboard(elements.tweetTextarea.value, 'Tweet copied to clipboard!');
    });
    
    // Submit Tweet button
    elements.submitTweetBtn.addEventListener('click', () => {
        const text = elements.tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        closeTweetModal();
        showToast('Redirected to Twitter/X!');
    });
}

// ==========================================================================
// Copy to Clipboard Actions
// ==========================================================================
function copyUpdateText(dayIndex, updateIndex) {
    const day = state.filteredReleases[dayIndex];
    const update = day.updates[updateIndex];
    
    // Format a nice plain text version for copy
    const formattedText = `BigQuery Release Note - ${day.date} [${update.category}]:\n\n${update.text}\n\nRead more: ${day.link}`;
    copyToClipboard(formattedText, 'Release note copied to clipboard!');
}

function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard.');
    });
}

function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

// ==========================================================================
// Twitter/X Composer Modal Logic
// ==========================================================================
function openTweetModal(dayIndex, updateIndex) {
    const day = state.filteredReleases[dayIndex];
    const update = day.updates[updateIndex];
    
    state.selectedUpdate = {
        date: day.date,
        link: day.link,
        category: update.category,
        text: update.text
    };
    
    // Load toggle checkboxes settings
    elements.toggleLink.checked = state.includeLink;
    elements.toggleHashtags.checked = state.includeHashtags;
    
    // Draft tweet text
    regenerateTweetDraft();
    
    // Show modal
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.classList.add('hidden');
    state.selectedUpdate = null;
}

function regenerateTweetDraft() {
    if (!state.selectedUpdate) return;
    
    const update = state.selectedUpdate;
    const prefix = `BigQuery [${update.category}] (${update.date}): `;
    const suffixParts = [];
    
    if (state.includeLink) {
        suffixParts.push(update.link);
    }
    if (state.includeHashtags) {
        suffixParts.push('#BigQuery #GCP');
    }
    
    const suffix = suffixParts.join(' ');
    
    // Twitter handles URLs as taking exactly 23 characters.
    // We want to calculate how much text from the description we can fit.
    // Total character limit = 280.
    // Let's find available space for the description text itself.
    const urlLengthInTwitter = state.includeLink ? 23 : 0;
    const hashtagsLength = state.includeHashtags ? ' #BigQuery #GCP'.length : 0;
    const spacingLength = (state.includeLink && state.includeHashtags) ? 2 : 1; // spaces between elements
    
    const metaLength = prefix.length + urlLengthInTwitter + hashtagsLength + spacingLength;
    const availableTextSpace = 280 - metaLength - 3; // 3 for ellipsis '...'
    
    let descriptionDraft = update.text;
    if (descriptionDraft.length > availableTextSpace) {
        // Truncate at word boundary if possible, otherwise hard truncate
        let truncated = descriptionDraft.substring(0, availableTextSpace);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > availableTextSpace * 0.8) {
            truncated = truncated.substring(0, lastSpace);
        }
        descriptionDraft = truncated + '...';
    }
    
    // Assemble the complete draft text for composer
    let fullTweetText = prefix + descriptionDraft;
    if (suffix) {
        fullTweetText += '\n\n' + suffix;
    }
    
    elements.tweetTextarea.value = fullTweetText;
    updateCharCount();
}

/**
 * Calculates the length of the tweet conforming to Twitter/X standards
 * where all URLs are counted as exactly 23 characters.
 */
function calculateTwitterLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Remove all URLs from the text
    const textWithoutUrls = text.replace(urlRegex, '');
    
    // Length is text without URLs + 23 characters for each URL
    return textWithoutUrls.length + (urls.length * 23);
}

function updateCharCount() {
    const text = elements.tweetTextarea.value;
    const count = calculateTwitterLength(text);
    
    elements.charCounter.textContent = `${count} / 280`;
    
    // Clear warning style classes
    elements.charCounter.className = 'char-counter';
    elements.charLimitWarning.classList.add('hidden');
    elements.submitTweetBtn.disabled = false;
    
    if (count > 280) {
        elements.charCounter.classList.add('danger');
        elements.charLimitWarning.classList.remove('hidden');
        elements.submitTweetBtn.disabled = true;
    } else if (count > 250) {
        elements.charCounter.classList.add('warning');
    }
}

// ==========================================================================
// CSV Export Utility
// ==========================================================================
function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        showToast('No releases available to export.');
        return;
    }
    
    // CSV Columns
    const headers = ['Date', 'Category', 'Description', 'Permalink'];
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Process filtered release notes
    state.filteredReleases.forEach(day => {
        day.updates.forEach(update => {
            // Helper to escape double quotes and wrap in quotes
            const formatCell = (val) => {
                const escaped = val.replace(/"/g, '""');
                return `"${escaped}"`;
            };
            
            const row = [
                formatCell(day.date),
                formatCell(update.category),
                formatCell(update.text),
                formatCell(day.link)
            ];
            
            csvRows.push(row.join(','));
        });
    });
    
    // Compile CSV and trigger download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `bigquery_releases_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully!');
}
