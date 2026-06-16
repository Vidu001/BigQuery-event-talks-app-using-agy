// BigQuery Release Notes - main.js

// App State
let releaseNotes = [];
let filteredNotes = [];
let selectedNote = null;
let currentPreset = 'standard';
let activeTypeFilter = 'all';
let searchQuery = '';
let currentSort = 'desc'; // 'desc' (newest first) or 'asc' (oldest first)

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheStatus = document.getElementById('cache-status');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterTagsContainer = document.getElementById('filter-tags');
const resultsCount = document.getElementById('results-count');
const sortSelect = document.getElementById('sort-select');
const releaseNotesContainer = document.getElementById('release-notes-container');

// State Screens
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Widgets
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statChanged = document.getElementById('stat-changed');
const statIssues = document.getElementById('stat-issues');

// Composer Widgets
const composerPlaceholder = document.getElementById('composer-placeholder');
const composerBody = document.getElementById('composer-body');
const composerSelectionBadge = document.getElementById('composer-selection-badge');
const composerNoteType = document.getElementById('composer-note-type');
const composerNoteDate = document.getElementById('composer-note-date');
const composerNoteText = document.getElementById('composer-note-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charCounterElem = document.getElementById('char-counter');
const tweetBtn = document.getElementById('tweet-btn');
const deselectBtn = document.getElementById('deselect-btn');
const presetStandard = document.getElementById('preset-standard');
const presetShort = document.getElementById('preset-short');
const presetHype = document.getElementById('preset-hype');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh buttons
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        handleSearch();
    });

    // Filters
    filterTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.filter-tag');
        if (!tag) return;
        
        // Remove active class from all
        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        
        activeTypeFilter = tag.dataset.type;
        applyFiltersAndSort();
    });

    // Sort
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        applyFiltersAndSort();
    });

    // Reset Filters Empty State
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchQuery = '';
        activeTypeFilter = 'all';
        
        document.querySelectorAll('.filter-tag').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.type === 'all') t.classList.add('active');
        });
        
        applyFiltersAndSort();
    });

    // Composer Presets
    presetStandard.addEventListener('click', () => setPreset('standard'));
    presetShort.addEventListener('click', () => setPreset('short'));
    presetHype.addEventListener('click', () => setPreset('hype'));

    // Textarea input
    tweetTextarea.addEventListener('input', updateCharCount);

    // Tweet Button
    tweetBtn.addEventListener('click', handleTweetSubmit);

    // Deselect Card
    deselectBtn.addEventListener('click', clearSelection);
}

// Fetch notes from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    showScreen('loading');
    refreshBtn.disabled = true;
    refreshIcon.classList.add('fa-spin');
    
    const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            releaseNotes = result.data;
            updateCacheStatus(result.timestamp, result.source);
            updateStats();
            applyFiltersAndSort();
            showScreen('content');
        } else {
            throw new Error(result.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message;
        showScreen('error');
    } finally {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('fa-spin');
    }
}

// Display screens helpers
function showScreen(screen) {
    loadingState.style.display = screen === 'loading' ? 'flex' : 'none';
    errorState.style.display = screen === 'error' ? 'flex' : 'none';
    emptyState.style.display = screen === 'empty' ? 'flex' : 'none';
    releaseNotesContainer.style.display = screen === 'content' ? 'flex' : 'none';
}

// Cache status timestamp formatter
function updateCacheStatus(timestamp, source) {
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sourceLabel = source === 'cache' ? 'Cached' : 'Synced';
    cacheStatus.textContent = `${sourceLabel} at ${timeStr}`;
}

// Update Stats Widgets
function updateStats() {
    statTotal.textContent = releaseNotes.length;
    
    const counts = releaseNotes.reduce((acc, note) => {
        const type = note.type.toLowerCase();
        if (type.includes('feature')) acc.features++;
        else if (type.includes('change')) acc.changed++;
        else if (type.includes('issue') || type.includes('fix') || type.includes('resolved')) acc.issues++;
        return acc;
    }, { features: 0, changed: 0, issues: 0 });
    
    statFeatures.textContent = counts.features;
    statChanged.textContent = counts.changed;
    statIssues.textContent = counts.issues;
}

// Handle Search Input
let searchDebounceTimeout;
function handleSearch() {
    clearTimeout(searchDebounceTimeout);
    
    // Toggle clear button
    if (searchInput.value.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    searchDebounceTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        applyFiltersAndSort();
    }, 250);
}

// Apply Search, Filters, and Sorting to the dataset
function applyFiltersAndSort() {
    filteredNotes = releaseNotes.filter(note => {
        // Type filter
        const noteType = note.type.toLowerCase();
        if (activeTypeFilter !== 'all') {
            if (activeTypeFilter === 'general') {
                // General covers types that are not feature, changed, issue, or deprecated
                const commonTypes = ['feature', 'changed', 'issue', 'resolved', 'deprecated', 'fix'];
                if (commonTypes.some(t => noteType.includes(t))) return false;
            } else if (activeTypeFilter === 'issue') {
                if (!noteType.includes('issue') && !noteType.includes('fix') && !noteType.includes('resolved')) return false;
            } else {
                if (!noteType.includes(activeTypeFilter)) return false;
            }
        }
        
        // Search query
        if (searchQuery) {
            const dateMatch = note.date.toLowerCase().includes(searchQuery);
            const typeMatch = note.type.toLowerCase().includes(searchQuery);
            const descMatch = note.description_text.toLowerCase().includes(searchQuery);
            return dateMatch || typeMatch || descMatch;
        }
        
        return true;
    });

    // Sorting
    // Dates are formatted as strings like "June 15, 2026". 
    // We should parse dates. Since dates are Standard Month Day, Year, they parse easily.
    filteredNotes.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return currentSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    resultsCount.textContent = `Showing ${filteredNotes.length} update${filteredNotes.length !== 1 ? 's' : ''}`;
    
    if (filteredNotes.length === 0) {
        showScreen('empty');
    } else {
        renderReleaseNotes();
        showScreen('content');
    }
}

// Render release notes to feed
function renderReleaseNotes() {
    releaseNotesContainer.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const isSelected = selectedNote && selectedNote.id === note.id;
        
        const card = document.createElement('div');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = note.id;
        
        const badgeClass = getBadgeClass(note.type);
        
        card.innerHTML = `
            <div class="note-card-header">
                <div class="note-card-meta">
                    <span class="note-badge ${badgeClass}">${note.type}</span>
                    <span class="note-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                </div>
            </div>
            <div class="note-card-body">
                ${note.description_html}
            </div>
            <div class="note-card-footer">
                <button class="btn btn-secondary btn-sm select-card-btn">
                    <i class="fa-solid fa-pen-to-square"></i> ${isSelected ? 'Selected' : 'Select to Tweet'}
                </button>
                <button class="btn btn-tweet btn-sm direct-tweet-btn">
                    <i class="fa-brands fa-x-twitter"></i> Tweet Now
                </button>
            </div>
        `;
        
        // Card click triggers select
        card.addEventListener('click', (e) => {
            // Prevent trigger if they click links inside the body
            if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'CODE') {
                return;
            }
            
            // Direct Tweet button check
            if (e.target.closest('.direct-tweet-btn')) {
                e.stopPropagation();
                selectNote(note);
                // Trigger tweet immediately using default template
                setTimeout(() => {
                    handleTweetSubmit();
                }, 50);
                return;
            }
            
            selectNote(note);
        });
        
        releaseNotesContainer.appendChild(card);
    });
}

// Get Badge color CSS class based on type name
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change')) return 'changed';
    if (t.includes('issue') || t.includes('fix') || t.includes('resolved')) return 'issue';
    if (t.includes('deprecat')) return 'deprecated';
    return 'general';
}

// Select Note and open/update Composer
function selectNote(note) {
    selectedNote = note;
    
    // Highlight active card
    document.querySelectorAll('.note-card').forEach(card => {
        if (card.dataset.id === note.id) {
            card.classList.add('selected');
            const selectBtn = card.querySelector('.select-card-btn');
            if (selectBtn) selectBtn.innerHTML = `<i class="fa-solid fa-check"></i> Selected`;
        } else {
            card.classList.remove('selected');
            const selectBtn = card.querySelector('.select-card-btn');
            if (selectBtn) selectBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Select to Tweet`;
        }
    });
    
    // Update Composer Widget View
    composerPlaceholder.style.display = 'none';
    composerBody.style.display = 'flex';
    composerSelectionBadge.style.display = 'block';
    
    composerNoteType.textContent = note.type;
    composerNoteType.className = `note-type-badge text-${getBadgeClass(note.type)}`;
    composerNoteDate.textContent = note.date;
    
    // Preview of original text
    composerNoteText.textContent = note.description_text;
    
    // Set active template
    generateTweetTemplate();
}

// Generate Tweet Text based on active preset
function generateTweetTemplate() {
    if (!selectedNote) return;
    
    const date = selectedNote.date;
    const type = selectedNote.type;
    const link = selectedNote.link;
    const originalText = selectedNote.description_text;
    
    let tweetText = '';
    
    // Let's find how many chars we have for the description
    // Twitter/X standard link length is counted as 23 characters regardless of actual length.
    const urlPlaceholder = "https://t.co/xxxxxxxxxx";
    const xLink = link || "https://cloud.google.com/bigquery/docs/release-notes";
    
    // Draft layouts
    const layouts = {
        standard: {
            prefix: `📢 BigQuery Update (${date})\n\n[${type}]: `,
            suffix: `\n\nRead more: ${xLink}\n#BigQuery #GoogleCloud`
        },
        short: {
            prefix: `BigQuery (${date}) - ${type}: `,
            suffix: `\n${xLink} #BigQuery`
        },
        hype: {
            prefix: `🚀 New BigQuery update! (${date})\n\n[${type}] `,
            suffix: `\n\nFull details: ${xLink} #DataEngineering #BigQuery`
        }
    };
    
    const layout = layouts[currentPreset];
    
    // Calculate lengths:
    // Fixed parts length (counting URL as 23 chars as Twitter does, but for our local count we'll count actual link or 23 for accuracy)
    const urlLengthInTwitter = 23;
    const prefixLen = layout.prefix.length;
    const suffixLen = layout.suffix.replace(xLink, "x".repeat(urlLengthInTwitter)).length;
    const reservedLen = prefixLen + suffixLen;
    
    const maxDescLen = 280 - reservedLen;
    
    let truncatedDesc = originalText;
    if (originalText.length > maxDescLen) {
        truncatedDesc = originalText.substring(0, maxDescLen - 3) + "...";
    }
    
    // Replace layout placeholder with actual description
    tweetText = layout.prefix + truncatedDesc + layout.suffix;
    
    tweetTextarea.value = tweetText;
    updateCharCount();
}

// Change preset layout
function setPreset(preset) {
    currentPreset = preset;
    
    // Update active button styling
    presetStandard.classList.remove('active');
    presetShort.classList.remove('active');
    presetHype.classList.remove('active');
    
    if (preset === 'standard') presetStandard.classList.add('active');
    else if (preset === 'short') presetShort.classList.add('active');
    else if (preset === 'hype') presetHype.classList.add('active');
    
    generateTweetTemplate();
}

// Update character counter in Composer
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // Twitter counts links as 23 chars. Let's calculate the "Twitter-equivalent" character length.
    // Regex for URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    let twitterLength = text.length;
    
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
        twitterLength = twitterLength - url.length + 23;
    });
    
    charCount.textContent = twitterLength;
    
    // Warning and error classes
    charCounterElem.className = 'char-counter';
    if (twitterLength > 280) {
        charCounterElem.classList.add('error');
        tweetBtn.disabled = true;
    } else if (twitterLength > 260) {
        charCounterElem.classList.add('warning');
        tweetBtn.disabled = false;
    } else {
        tweetBtn.disabled = false;
    }
}

// Clear currently selected note
function clearSelection() {
    selectedNote = null;
    
    // Clear card selection highlighting
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('selected');
        const selectBtn = card.querySelector('.select-card-btn');
        if (selectBtn) selectBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Select to Tweet`;
    });
    
    // Clear Composer
    composerPlaceholder.style.display = 'flex';
    composerBody.style.display = 'none';
    composerSelectionBadge.style.display = 'none';
}

// Share on Twitter via Web Intent
function handleTweetSubmit() {
    if (!tweetTextarea.value.trim()) return;
    
    const text = encodeURIComponent(tweetTextarea.value);
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;
    
    // Open Twitter intent in new window/tab
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
}
