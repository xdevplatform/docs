// JavaScript to inject the slider component
console.log('Injection script loaded.');

let injected = false;
let dropdownOpen = false;
let pricingData = null;
let pricingDataPromise = null;

// Fetch pricing data from API
async function fetchPricingData() {
  if (pricingData) {
    return pricingData;
  }
  
  if (pricingDataPromise) {
    return pricingDataPromise;
  }
  
  pricingDataPromise = fetch('https://console.x.com/api/credits/pricing')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch pricing data');
      }
      return response.json();
    })
    .then(data => {
      pricingData = data;
      return data;
    })
    .catch(error => {
      console.error('Error fetching pricing data:', error);
      pricingDataPromise = null;
      return null;
    });
  
  return pricingDataPromise;
}

// Build mapping from pricing types to display strings
function getPricingTypeDisplayName(pricingType) {
  const displayMapping = {
    // EventTypePricing
    'Post': 'Post: Read',
    'User': 'User: Read',
    'List': 'List: Read',
    'Space': 'Space: Read',
    'Community': 'Community: Read',
    'DirectMessage': 'DM Event: Read',
    'ProfileUpdate': 'Profile: Update',
    'Like': 'Like: Read',
    'Follow': 'Follow: Read',
    'Mute': 'Mute: Read',
    'Block': 'Block: Read',
    'News': 'News: Read',
    // RequestTypePricing
    'Bookmark': 'Bookmark',
    'DmInteractionCreate': 'DM Interaction: Create',
    'UserInteractionCreate': 'User Interaction: Create',
    'InteractionDelete': 'Interaction: Delete',
    'ContentCreate': 'Content: Create',
    'ContentManage': 'Content: Manage',
    'ListCreate': 'List: Create',
    'ListManage': 'List: Manage',
    'MediaMetadata': 'Media Metadata',
    'PrivacyUpdate': 'Privacy: Update',
    'MuteDelete': 'Mute: Delete',
    'CountsRecent': 'Counts: Recent',
    'CountsAll': 'Counts: All',
    'Trends': 'Trend: Read',
    'Write': 'Write'
  };
  
  return displayMapping[pricingType] || pricingType;
}

// Build mapping from page slugs to pricing types
// Format: "get-users-by-ids" -> "User"
function buildSlugToPricingTypeMapping() {
  const mapping = {};
  
  // EventTypePricing mappings (charged per resource)
  // Post endpoints
  mapping['get-posts-by-ids'] = 'Post';
  mapping['get-post-by-id'] = 'Post';
  mapping['get-posts'] = 'Post';
  mapping['get-mentions'] = 'Post';
  mapping['search-recent-posts'] = 'Post';
  mapping['search-all-posts'] = 'Post';
  mapping['get-timeline'] = 'Post';
  mapping['get-reposts'] = 'Post';
  mapping['get-reposted-by'] = 'User'; // Returns users who reposted
  mapping['get-quoted-posts'] = 'Post';
  mapping['get-liking-users'] = 'User'; // Returns users who liked
  mapping['get-reposts-of-me'] = 'Post';
  mapping['get-list-posts'] = 'Post';
  mapping['get-space-posts'] = 'Post';
  
  // User endpoints
  mapping['get-users-by-ids'] = 'User';
  mapping['get-user-by-id'] = 'User';
  mapping['get-user-by-username'] = 'User';
  mapping['get-users-by-usernames'] = 'User';
  mapping['get-followers'] = 'User';
  mapping['get-following'] = 'User';
  mapping['get-liked-posts'] = 'Post'; // Returns posts
  mapping['get-bookmarks'] = 'Post'; // Returns bookmarked posts
  mapping['get-bookmarks-by-folder-id'] = 'Post'; // Returns bookmarked posts
  mapping['get-bookmark-folders'] = 'Bookmark'; // Bookmark folder metadata
  mapping['get-my-user'] = 'User';
  mapping['search-users'] = 'User';
  mapping['get-muting'] = 'User';
  mapping['get-blocking'] = 'User';
  mapping['get-pinned-lists'] = 'List';
  mapping['get-owned-lists'] = 'List';
  mapping['get-list-memberships'] = 'List';
  mapping['get-followed-lists'] = 'List';
  mapping['get-list-members'] = 'User';
  mapping['get-list-followers'] = 'User';
  
  // List endpoints
  mapping['get-list-by-id'] = 'List';
  
  // Space endpoints
  mapping['get-space-by-id'] = 'Space';
  mapping['search-spaces'] = 'Space';
  mapping['get-spaces-by-ids'] = 'Space';
  mapping['get-spaces-by-creator-ids'] = 'Space';
  mapping['get-space-ticket-buyers'] = 'User'; // Returns users
  
  // Community endpoints
  mapping['get-community-by-id'] = 'Community';
  mapping['search-communities'] = 'Community';
  
  // DirectMessage endpoints
  mapping['get-dm-events'] = 'DirectMessage';
  mapping['get-dm-events-for-a-dm-conversation'] = 'DirectMessage';
  mapping['get-dm-events-for-a-dm-conversation-1'] = 'DirectMessage';
  mapping['get-dm-event-by-id'] = 'DirectMessage';
  
  // RequestTypePricing mappings (charged per request)
  // DM_INTERACTION_CREATE
  mapping['create-dm-conversation'] = 'DmInteractionCreate';
  mapping['create-dm-message-by-conversation-id'] = 'DmInteractionCreate';
  mapping['create-dm-message-by-participant-id'] = 'DmInteractionCreate';
  
  // USER_INTERACTION_CREATE
  mapping['follow-user'] = 'UserInteractionCreate';
  mapping['like-post'] = 'UserInteractionCreate';
  mapping['repost-post'] = 'UserInteractionCreate';
  
  // INTERACTION_DELETE
  mapping['unlike-post'] = 'InteractionDelete';
  mapping['unfollow-user'] = 'InteractionDelete';
  mapping['unrepost-post'] = 'InteractionDelete';
  
  // CONTENT_CREATE
  mapping['create-post'] = 'ContentCreate';
  mapping['create-or-edit-post'] = 'ContentCreate';
  mapping['upload-media'] = 'ContentCreate';
  mapping['initialize-media-upload'] = 'ContentCreate';
  mapping['append-media-upload'] = 'ContentCreate';
  mapping['finalize-media-upload'] = 'ContentCreate';
  
  // CONTENT_MANAGE
  mapping['delete-post'] = 'ContentManage';
  mapping['delete-dm-event'] = 'ContentManage';
  mapping['hide-reply'] = 'ContentManage';
  
  // LIST_CREATE
  mapping['create-list'] = 'ListCreate';
  mapping['follow-list'] = 'ListCreate';
  mapping['pin-list'] = 'ListCreate';
  mapping['add-list-member'] = 'ListCreate';
  
  // LIST_MANAGE
  mapping['delete-list'] = 'ListManage';
  mapping['unfollow-list'] = 'ListManage';
  mapping['unpin-list'] = 'ListManage';
  mapping['update-list'] = 'ListManage';
  mapping['remove-list-member'] = 'ListManage';
  
  // BOOKMARK
  mapping['create-bookmark'] = 'Bookmark';
  mapping['delete-bookmark'] = 'Bookmark';
  
  // MEDIA_METADATA
  mapping['create-media-metadata'] = 'MediaMetadata';
  mapping['create-media-subtitles'] = 'MediaMetadata';
  mapping['delete-media-subtitles'] = 'MediaMetadata';
  
  // PRIVACY_UPDATE
  mapping['mute-user'] = 'PrivacyUpdate';
  mapping['block-dms'] = 'PrivacyUpdate';
  mapping['unblock-dms'] = 'PrivacyUpdate';
  
  // MUTE_DELETE
  mapping['unmute-user'] = 'MuteDelete';
  
  // COUNTS_RECENT
  mapping['get-count-of-recent-posts'] = 'CountsRecent';
  
  // COUNTS_ALL
  mapping['get-count-of-all-posts'] = 'CountsAll';
  
  // Stream rules (configuration endpoints - may not have pricing)
  mapping['get-stream-rules'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-stream-rule-counts'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['update-stream-rules'] = 'ContentManage'; // Placeholder - may need to verify
  
  // Usage endpoints (metadata - may not have pricing)
  mapping['get-usage'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // TRENDS
  mapping['get-trends-by-woeid'] = 'Trends';
  mapping['get-personalized-trends'] = 'Trends';
  mapping['get-ai-trends-by-id'] = 'Trends';
  
  // Analytics endpoints (may not have pricing)
  mapping['get-post-analytics'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-media-analytics'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-28-hour-post-insights'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-historical-post-insights'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // Media lookup endpoints
  mapping['get-media-by-media-key'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-media-by-media-keys'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-media-upload-status'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // News endpoints
  mapping['search-news'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-news-stories-by-id'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // Webhook endpoints (configuration - may not have pricing)
  mapping['create-webhook'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['get-webhook'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['delete-webhook'] = 'ContentManage'; // Placeholder - may need to verify
  mapping['validate-webhook'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['create-stream-link'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['get-stream-links'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['delete-stream-link'] = 'ContentManage'; // Placeholder - may need to verify
  mapping['create-replay-job-for-webhook'] = 'ContentCreate'; // Placeholder - may need to verify
  
  // Compliance endpoints (may not have pricing)
  mapping['create-compliance-job'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['get-compliance-jobs'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-compliance-job-by-id'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // Community Notes endpoints (may not have pricing)
  mapping['create-a-community-note'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['delete-a-community-note'] = 'ContentManage'; // Placeholder - may need to verify
  mapping['evaluate-a-community-note'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['search-for-community-notes-written'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['search-for-posts-eligible-for-community-notes'] = 'Post'; // Returns posts
  
  // Account Activity endpoints (may not have pricing)
  mapping['create-subscription'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['delete-subscription'] = 'ContentManage'; // Placeholder - may need to verify
  mapping['get-subscriptions'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['get-subscription-count'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['validate-subscription'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['create-replay-job'] = 'ContentCreate'; // Placeholder - may need to verify
  
  // Activity endpoints (may not have pricing)
  mapping['activity-stream'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['create-x-activity-subscription'] = 'ContentCreate'; // Placeholder - may need to verify
  mapping['deletes-x-activity-subscription'] = 'ContentManage'; // Placeholder - may need to verify
  mapping['get-x-activity-subscriptions'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['update-x-activity-subscription'] = 'ContentManage'; // Placeholder - may need to verify
  
  // Connections endpoints (may not have pricing)
  mapping['get-connection-history'] = 'CountsRecent'; // Placeholder - may need to verify
  mapping['terminate-all-connections'] = 'ContentManage'; // Placeholder - may need to verify
  
  // General endpoints
  mapping['get-openapi-spec'] = 'CountsRecent'; // Placeholder - may need to verify
  
  // Stream endpoints (these are streaming, pricing may be different)
  mapping['stream-filtered-posts'] = 'Post';
  mapping['stream-sampled-posts'] = 'Post';
  mapping['stream-10-sampled-posts'] = 'Post';
  mapping['stream-all-posts'] = 'Post';
  mapping['stream-english-posts'] = 'Post';
  mapping['stream-japanese-posts'] = 'Post';
  mapping['stream-korean-posts'] = 'Post';
  mapping['stream-portuguese-posts'] = 'Post';
  mapping['stream-all-likes'] = 'Post';
  mapping['stream-sampled-likes'] = 'Post';
  mapping['stream-posts-compliance-data'] = 'Post';
  mapping['stream-likes-compliance-data'] = 'Post';
  mapping['stream-users-compliance-data'] = 'User';
  mapping['stream-post-labels'] = 'Post';
  
  return mapping;
}


let pageSlugMapping = null;
let pageSlugMappingPromise = null;

async function getPageSlugMapping() {
  if (pageSlugMapping) return pageSlugMapping;
  if (pageSlugMappingPromise) return pageSlugMappingPromise;
  
  pageSlugMappingPromise = buildPageSlugToEndpointMapping().then(mapping => {
    pageSlugMapping = mapping;
    return mapping;
  });
  
  return pageSlugMappingPromise;
}

// Extract endpoint from page using URL slug mapping
// Maps page slugs (e.g., "get-users-by-ids") to endpoints (e.g., "get /2/users")
// Extract pricing type from page using URL slug
function extractPricingTypeFromPage() {
  const apiPage = document.getElementById('api-playground-2-operation-page');
  if (!apiPage) {
    console.log('[Cost Estimator] No api-playground-2-operation-page element found');
    return null;
  }
  
  console.log('[Cost Estimator] Extracting pricing type from page URL...');
  
  // Extract slug from URL (e.g., /x-api/users/get-users-by-ids -> get-users-by-ids)
  const urlPath = window.location.pathname;
  const slugMatch = urlPath.match(/\/([^\/]+)$/);
  
  if (!slugMatch) {
    console.log('[Cost Estimator] Could not extract slug from URL:', urlPath);
    return null;
  }
  
  const slug = slugMatch[1];
  console.log('[Cost Estimator] Extracted slug from URL:', slug);
  
  // Build slug to pricing type mapping
  const slugMapping = buildSlugToPricingTypeMapping();
  
  // Try exact match first
  if (slugMapping[slug]) {
    const pricingType = slugMapping[slug];
    console.log('[Cost Estimator] Found pricing type from slug mapping:', pricingType);
    return pricingType;
  }
  
  // Try variations of the slug
  const variations = [
    slug,
    slug.replace(/-/g, ''),
    slug.replace(/-/g, '_'),
    slug.split('-').slice(-3).join('-'), // Last 3 parts
    slug.split('-').slice(-2).join('-'), // Last 2 parts
  ];
  
  for (const variation of variations) {
    if (slugMapping[variation]) {
      console.log('[Cost Estimator] Found pricing type from slug variation:', variation, '->', slugMapping[variation]);
      return slugMapping[variation];
    }
  }
  
  console.log('[Cost Estimator] No mapping found for slug:', slug);
  return null;
}

// Get pricing for a pricing type
async function getPricingForType(pricingType) {
  if (!pricingType) {
    console.log('[Cost Estimator] getPricingForType: No pricing type provided');
    return null;
  }
  
  console.log('[Cost Estimator] Looking up pricing for type:', pricingType);
  
  const pricing = await fetchPricingData();
  if (!pricing) {
    console.log('[Cost Estimator] Failed to fetch pricing data');
    return null;
  }
  
  // Check eventTypePricing first
  if (pricing.eventTypePricing && pricing.eventTypePricing[pricingType]) {
    const cost = pricing.eventTypePricing[pricingType];
    console.log('[Cost Estimator] Found event pricing:', cost);
    return {
      type: 'event',
      cost: cost,
      pricingType: pricingType
    };
  }
  
  // Check requestTypePricing
  if (pricing.requestTypePricing && pricing.requestTypePricing[pricingType]) {
    const cost = pricing.requestTypePricing[pricingType];
    console.log('[Cost Estimator] Found request pricing:', cost);
    return {
      type: 'request',
      cost: cost,
      pricingType: pricingType
    };
  }
  
  console.log('[Cost Estimator] Pricing type found but no cost in pricing data:', pricingType);
  console.log('[Cost Estimator] Available event types:', Object.keys(pricing.eventTypePricing || {}));
  console.log('[Cost Estimator] Available request types:', Object.keys(pricing.requestTypePricing || {}));
  return null;
}

function createSliderContent(endpointName, unitCost, pricingType) {
  const maxUsage = 50000; // 50k
  
  // Determine if this is event type (per resource) or request type (per request)
  const eventTypePricing = ['Post', 'User', 'List', 'Space', 'Community', 'DirectMessage', 'ProfileUpdate', 'Like', 'Follow', 'Mute', 'Block', 'News'];
  const isEventType = eventTypePricing.includes(pricingType);
  const unitLabel = isEventType ? 'per resource' : 'per request';
  const usageLabelText = isEventType ? 'resources' : 'requests';
  
  // Create the container div - match code block background
  const container = document.createElement('div');
  container.id = 'injected-slider';
  container.className = 'border border-gray-950/10 dark:border-white/10 rounded-lg p-4';
  container.style.backgroundColor = '#0B0C0E';
  container.style.overflow = 'visible'; // Allow tooltip to overflow
  
  // Title section with info icon
  const titleDiv = document.createElement('div');
  titleDiv.className = 'flex items-center gap-2 mb-4';
  
  const titleText = document.createElement('span');
  titleText.className = 'text-sm font-medium text-gray-950 dark:text-gray-50';
  const endpointNameSpan = document.createElement('span');
  endpointNameSpan.textContent = endpointName;
  // Set the CSS variable first, then use it in the color
  endpointNameSpan.style.setProperty('--tw-text-opacity', '1');
  endpointNameSpan.style.color = 'rgb(96 165 250 / var(--tw-text-opacity))';
  titleText.appendChild(document.createTextNode('Estimated Cost for '));
  titleText.appendChild(endpointNameSpan);
  titleDiv.appendChild(titleText);
  
  // Info icon with tooltip
  const infoIconContainer = document.createElement('div');
  infoIconContainer.className = 'relative';
  infoIconContainer.style.position = 'relative';
  
  const infoIcon = document.createElement('div');
  infoIcon.className = 'cursor-help';
  infoIcon.style.color = '#9ca3af'; // gray-400
  infoIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <text x="8" y="11" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">i</text>
    </svg>
  `;
  infoIconContainer.appendChild(infoIcon);
  
  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'absolute';
  tooltip.style.bottom = '100%';
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.marginBottom = '8px';
  tooltip.style.padding = '8px 12px';
  tooltip.style.fontSize = '12px';
  // Use the same dark background as the container
  tooltip.style.backgroundColor = '#0B0C0E';
  tooltip.style.color = '#e5e7eb'; // gray-200 - light text for good contrast
  tooltip.style.borderRadius = '8px';
  tooltip.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)';
  tooltip.style.maxWidth = '250px';
  tooltip.style.whiteSpace = 'normal';
  tooltip.style.opacity = '0';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.transition = 'opacity 0.2s';
  tooltip.style.zIndex = '9999'; // Very high z-index to ensure it's on top
  tooltip.style.position = 'absolute';
  tooltip.textContent = 'This estimate is for informational purposes only and is based on user inputs and current rates; actual bills may differ due to taxes, fees, usage variations, rate changes, or other factors.';
  
  infoIconContainer.appendChild(tooltip);
  
  // Show tooltip on hover - move to body to avoid overflow issues
  let tooltipInBody = false;
  
  infoIconContainer.addEventListener('mouseenter', () => {
    const rect = infoIconContainer.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Move tooltip to body to avoid overflow clipping
    if (!tooltipInBody) {
      infoIconContainer.removeChild(tooltip);
      document.body.appendChild(tooltip);
      tooltipInBody = true;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 8}px`;
    tooltip.style.bottom = 'auto';
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.opacity = '1';
  });
  
  infoIconContainer.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
    // Return to original container after fade out
    setTimeout(() => {
      if (tooltipInBody && tooltip.parentElement === document.body) {
        document.body.removeChild(tooltip);
        tooltip.style.position = 'absolute';
        tooltip.style.left = '50%';
        tooltip.style.bottom = '100%';
        tooltip.style.top = 'auto';
        tooltip.style.transform = 'translateX(-50%)';
        infoIconContainer.appendChild(tooltip);
        tooltipInBody = false;
      }
    }, 200);
  });
  
  titleDiv.appendChild(infoIconContainer);
  container.appendChild(titleDiv);
  
  // Unit cost display
  const unitCostDiv = document.createElement('div');
  unitCostDiv.className = 'text-xs text-gray-500 dark:text-gray-400 mb-2';
  unitCostDiv.textContent = `Unit Cost: $${unitCost.toFixed(3)} ${unitLabel}`;
  container.appendChild(unitCostDiv);
  
  // Usage label
  const usageLabel = document.createElement('div');
  usageLabel.className = 'flex justify-between text-sm mb-1';
  usageLabel.innerHTML = `<span class="text-gray-500 dark:text-gray-400">Usage</span><span id="usage-value" class="text-gray-950 dark:text-gray-50">0k ${usageLabelText}</span>`;
  container.appendChild(usageLabel);
  
  // Slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = maxUsage / 1000; // In k
  slider.value = 0;
  slider.className = 'w-full mb-2';
  slider.id = 'usage-slider';
  container.appendChild(slider);
  
  // Cost display
  const costDisplay = document.createElement('div');
  costDisplay.className = 'flex justify-between text-xs';
  costDisplay.innerHTML = '<span class="text-gray-500 dark:text-gray-400">0k</span><span id="estimated-cost" class="text-green-500 font-medium">$0.00</span><span class="text-gray-500 dark:text-gray-400">50k</span>';
  container.appendChild(costDisplay);
  
  // Event listener for slider
  slider.addEventListener('input', function() {
    const usageK = parseInt(this.value);
    const usage = usageK * 1000;
    const cost = usage * unitCost;
    
    document.getElementById('usage-value').textContent = `${usageK}k ${usageLabelText}`;
    document.getElementById('estimated-cost').textContent = `$${cost.toFixed(2)}`;
  });
  
  return container;
}

function toggleCostEstimatorDropdown() {
  const dropdown = document.getElementById('cost-estimator-dropdown');
  if (!dropdown) {
    console.log('[Cost Estimator] Dropdown not found, cannot toggle');
    return;
  }
  
  dropdownOpen = !dropdownOpen;
  
  if (dropdownOpen) {
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}

function showCostEstimator() {
  // Show the cost estimator dropdown
  const dropdown = document.getElementById('cost-estimator-dropdown');
  if (!dropdown) {
    console.log('[Cost Estimator] Dropdown not found, cannot show');
    return;
  }
  
  if (!dropdownOpen) {
    toggleCostEstimatorDropdown();
  }
}

function findMenuContent() {
  // Find the Radix UI menu content - it's usually rendered in a portal
  // Look for elements with role="menu" or data-radix-menu-content
  // Try multiple selectors to find the menu
  const selectors = [
    '[role="menu"]',
    '[data-radix-menu-content]',
    '[id*="radix"][role="menu"]',
    '[data-radix-dropdown-menu-content]',
    '[data-radix-menu-viewport]',
    'div[role="menu"]'
  ];
  
  for (const selector of selectors) {
    const menuContent = document.querySelector(selector);
    if (menuContent && menuContent.offsetParent !== null) {
      // Check if it's visible (not hidden)
      const style = window.getComputedStyle(menuContent);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        console.log('[Cost Estimator] Found menu content with selector:', selector);
        return menuContent;
      }
    }
  }
  
  // If no visible menu found, return the first one anyway (might be in portal)
  const menuContent = document.querySelector('[role="menu"]') || 
                      document.querySelector('[data-radix-menu-content]') ||
                      document.querySelector('[id*="radix"][role="menu"]');
  
  if (menuContent) {
    console.log('[Cost Estimator] Found menu content (may be hidden):', menuContent);
  } else {
    console.log('[Cost Estimator] No menu content found with any selector');
  }
  
  return menuContent;
}

// Function to create or update dropdown with current page's pricing
async function createOrUpdateDropdown() {
  const pageContextMenu = document.getElementById('page-context-menu');
  if (!pageContextMenu) {
    console.log('[Cost Estimator] Page context menu not found');
    return null;
  }
  
  // Remove any existing dropdown
  const existingDropdown = document.getElementById('cost-estimator-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
    console.log('[Cost Estimator] Removed existing dropdown');
  }
  
  // Get current page's pricing type and pricing
  const pricingType = extractPricingTypeFromPage();
  if (!pricingType) {
    console.log('[Cost Estimator] Could not extract pricing type for dropdown');
    return null;
  }
  
  const pricing = await getPricingForType(pricingType);
  if (!pricing) {
    console.log('[Cost Estimator] Could not get pricing for dropdown');
    return null;
  }
  
  // Create new dropdown with current page's pricing
  const dropdown = document.createElement('div');
  dropdown.id = 'cost-estimator-dropdown';
  dropdown.className = 'hidden absolute right-0 mt-2 z-50';
  dropdown.style.top = '100%';
  dropdown.style.marginTop = '0.5rem';
  
  const endpointDisplayName = getPricingTypeDisplayName(pricingType);
  const sliderContent = createSliderContent(endpointDisplayName, pricing.cost, pricingType);
  dropdown.appendChild(sliderContent);
  
  // Position the page context menu as relative for absolute dropdown positioning
  if (window.getComputedStyle(pageContextMenu).position === 'static') {
    pageContextMenu.style.position = 'relative';
  }
  
  // Append dropdown to page context menu
  pageContextMenu.appendChild(dropdown);
  console.log('[Cost Estimator] Dropdown created/updated with pricing type:', pricingType);
  
  return dropdown;
}

async function injectElement() {
  console.log('Attempting to inject element...');
  
  // Check if this is an API reference page
  const apiPage = document.getElementById('api-playground-2-operation-page');
  if (!apiPage) {
    console.log('Not an API reference page, skipping.');
    return;
  }
  
  // Reset injected flag on new page (check by URL change)
  const currentUrl = window.location.pathname;
  if (window.lastInjectedUrl !== currentUrl) {
    injected = false;
    window.lastInjectedUrl = currentUrl;
    console.log('[Cost Estimator] New page detected, resetting injection state');
  }
  
  // Check if already injected
  if (injected) {
    console.log('Element already injected, skipping.');
    return;
  }
  
  // Check if menu item already exists
  if (document.getElementById('cost-estimator-menu-item')) {
    console.log('Cost estimator menu item already exists, skipping.');
    injected = true;
    return;
  }
  
  // Extract pricing type from page slug
  const pricingType = extractPricingTypeFromPage();
  console.log('[Cost Estimator] Extracted pricing type:', pricingType);
  
  if (!pricingType) {
    console.log('[Cost Estimator] Could not extract pricing type from page, skipping cost estimator.');
    return;
  }
  
  // Get pricing for this type
  const pricing = await getPricingForType(pricingType);
  console.log('[Cost Estimator] Pricing:', pricing);
  
  if (!pricing) {
    console.log('[Cost Estimator] No pricing found for type:', pricingType, 'skipping cost estimator.');
    return;
  }
  
  console.log('[Cost Estimator] Pricing found! Cost:', pricing.cost, 'Type:', pricing.pricingType);
  
  // Find the page context menu container
  const pageContextMenu = document.getElementById('page-context-menu');
  if (!pageContextMenu) {
    console.log('Page context menu not found, skipping.');
    return;
  }
  
  // Function to modify the Copy page button
  function modifyCopyPageButton(button) {
    if (!button) return false;
    
    // Check if already modified
    if (button.dataset.pricingModified === 'true') {
      return true;
    }
    
    console.log('[Cost Estimator] Modifying Copy page button to View Pricing');
    
    // Replace the icon with dollar sign - try multiple approaches
    // Look for SVG in the button, including nested in divs
    // The SVG should be inside: button > div > svg
    const buttonDiv = button.querySelector('div.flex.items-center');
    let existingIcon = null;
    
    if (buttonDiv) {
      existingIcon = buttonDiv.querySelector('svg');
    }
    
    if (!existingIcon) {
      // Fallback: search anywhere in button
      existingIcon = button.querySelector('svg');
    }
    
    if (existingIcon) {
      console.log('[Cost Estimator] Found SVG icon, replacing with dollar sign');
      console.log('[Cost Estimator] Original SVG:', existingIcon.outerHTML);
      
      // Get all attributes from the original icon to preserve them
      const viewBox = existingIcon.getAttribute('viewBox') || '0 0 18 18';
      const width = existingIcon.getAttribute('width') || '18';
      const height = existingIcon.getAttribute('height') || '18';
      const className = existingIcon.getAttribute('class') || '';
      const fill = existingIcon.getAttribute('fill') || 'none';
      const xmlns = existingIcon.getAttribute('xmlns') || 'http://www.w3.org/2000/svg';
      
      // Parse viewBox to get center coordinates
      const viewBoxParts = viewBox.split(' ').map(Number);
      const viewBoxWidth = viewBoxParts[2] || 18;
      const viewBoxHeight = viewBoxParts[3] || 18;
      const centerX = viewBoxWidth / 2;
      const centerY = viewBoxHeight / 2;
      
      // Clear ALL existing SVG content (paths, shapes, groups, etc.)
      existingIcon.innerHTML = '';
      
      // Ensure the SVG has the right attributes
      existingIcon.setAttribute('viewBox', viewBox);
      existingIcon.setAttribute('width', width);
      existingIcon.setAttribute('height', height);
      if (className) existingIcon.setAttribute('class', className);
      existingIcon.setAttribute('fill', fill);
      existingIcon.setAttribute('xmlns', xmlns);
      
      // Create dollar sign using SVG path (more reliable than text)
      // Dollar sign path for viewBox 0 0 18 18 - simplified version
      const dollarPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      // Dollar sign: vertical line with S shape through it
      dollarPath.setAttribute('d', 'M9 2.25V4.5M9 13.5V15.75M11.25 6.75C11.25 8.40685 10.0784 9.75 8.25 9.75C6.42157 9.75 5.25 8.40685 5.25 6.75C5.25 5.10315 6.42157 3.75 8.25 3.75C10.0784 3.75 11.25 5.10315 11.25 6.75M11.25 11.25C11.25 12.8969 10.0784 14.25 8.25 14.25C6.42157 14.25 5.25 12.8969 5.25 11.25C5.25 9.60315 6.42157 8.25 8.25 8.25C10.0784 8.25 11.25 9.60315 11.25 11.25');
      dollarPath.setAttribute('stroke', 'currentColor');
      dollarPath.setAttribute('stroke-width', '1.5');
      dollarPath.setAttribute('stroke-linecap', 'round');
      dollarPath.setAttribute('stroke-linejoin', 'round');
      dollarPath.setAttribute('fill', 'none');
      
      // Add the path to the existing SVG (preserving all attributes)
      existingIcon.appendChild(dollarPath);
      
      // Also add text as primary (path is backup) - make it visible and properly styled
      const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      dollarText.setAttribute('x', centerX.toString());
      dollarText.setAttribute('y', (centerY + 0.5).toString()); // Slight adjustment for better centering
      dollarText.setAttribute('text-anchor', 'middle');
      dollarText.setAttribute('dominant-baseline', 'central');
      dollarText.setAttribute('fill', 'currentColor');
      dollarText.setAttribute('font-size', (Math.min(viewBoxWidth, viewBoxHeight) * 0.9).toString());
      dollarText.setAttribute('font-weight', '700');
      dollarText.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      dollarText.setAttribute('style', 'user-select: none; pointer-events: none;');
      dollarText.textContent = '$';
      existingIcon.appendChild(dollarText);
      
      console.log('[Cost Estimator] SVG icon replaced with dollar sign');
      console.log('[Cost Estimator] New SVG:', existingIcon.outerHTML);
    } else {
      console.log('[Cost Estimator] No SVG icon found in button, creating new one');
      // If no SVG exists, we need to create one and insert it before the text
      // Find the div that contains the text (should be div.flex.items-center)
      const buttonDiv = button.querySelector('div.flex.items-center, div');
      if (buttonDiv) {
        console.log('[Cost Estimator] Found button div, creating SVG icon');
        // Create a new SVG element matching the original structure
        const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        newSvg.setAttribute('width', '18');
        newSvg.setAttribute('height', '18');
        newSvg.setAttribute('viewBox', '0 0 18 18');
        newSvg.setAttribute('fill', 'none');
        newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        newSvg.setAttribute('class', 'w-4 h-4');
        
        // Add dollar sign text (primary method - same as menu item)
        const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dollarText.setAttribute('x', '9');
        dollarText.setAttribute('y', '13');
        dollarText.setAttribute('text-anchor', 'middle');
        dollarText.setAttribute('fill', 'currentColor');
        dollarText.setAttribute('font-size', '16');
        dollarText.setAttribute('font-weight', 'bold');
        dollarText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
        dollarText.textContent = '$';
        newSvg.appendChild(dollarText);
        
        // Insert SVG as the first child of the div (before the text)
        // The div structure is: <div>View Pricing</div> or <div><span>View Pricing</span></div>
        const firstChild = buttonDiv.firstChild;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          // If first child is text node, insert before it
          buttonDiv.insertBefore(newSvg, firstChild);
        } else if (firstChild) {
          // Insert before first element
          buttonDiv.insertBefore(newSvg, firstChild);
        } else {
          // Prepend to div
          buttonDiv.insertBefore(newSvg, buttonDiv.firstChild);
        }
        
        console.log('[Cost Estimator] Created new SVG icon with dollar sign');
        console.log('[Cost Estimator] New SVG:', newSvg.outerHTML);
        console.log('[Cost Estimator] Button div after insertion:', buttonDiv.outerHTML.substring(0, 300));
      } else {
        console.log('[Cost Estimator] Could not find button div to insert SVG');
      }
    }
    
    // Update button text to "View Pricing"
    const buttonTextElements = button.querySelectorAll('span, div');
    buttonTextElements.forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('copy') || text.includes('page')) {
        el.textContent = 'View Pricing';
      }
      // Remove any description text
      if (text.includes('markdown') || text.includes('llm')) {
        el.textContent = '';
        el.style.display = 'none';
      }
    });
    
    // Also update any direct text nodes
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode.parentElement && textNode.parentElement.closest('svg')) {
        continue; // Skip SVG text
      }
      const text = textNode.textContent.trim().toLowerCase();
      if (text.includes('copy') || text.includes('page')) {
        textNode.textContent = 'View Pricing';
      }
      if (text.includes('markdown') || text.includes('llm')) {
        textNode.textContent = '';
      }
    }
    
    // Update aria-label if it exists
    if (button.hasAttribute('aria-label')) {
      button.setAttribute('aria-label', 'View Pricing');
    }
    
    // Mark as modified
    button.dataset.pricingModified = 'true';
    
    // Final check: ensure SVG exists after all modifications
    const finalCheckSvg = button.querySelector('svg');
    if (!finalCheckSvg) {
      console.log('[Cost Estimator] WARNING: SVG still missing after modifications, creating it now');
      const buttonDiv = button.querySelector('div.flex.items-center, div');
      if (buttonDiv) {
        const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        newSvg.setAttribute('width', '18');
        newSvg.setAttribute('height', '18');
        newSvg.setAttribute('viewBox', '0 0 18 18');
        newSvg.setAttribute('fill', 'none');
        newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        newSvg.setAttribute('class', 'w-4 h-4');
        
        const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dollarText.setAttribute('x', '9');
        dollarText.setAttribute('y', '13');
        dollarText.setAttribute('text-anchor', 'middle');
        dollarText.setAttribute('fill', 'currentColor');
        dollarText.setAttribute('font-size', '16');
        dollarText.setAttribute('font-weight', 'bold');
        dollarText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
        dollarText.textContent = '$';
        newSvg.appendChild(dollarText);
        
        buttonDiv.insertBefore(newSvg, buttonDiv.firstChild);
        console.log('[Cost Estimator] Created SVG in final check');
      }
    }
    
    return true;
  }
  
  // Find and modify the Copy page button
  let copyPageButton = pageContextMenu.querySelector('button[aria-label*="Copy"], button[aria-label*="copy"]');
  if (!copyPageButton) {
    // Try finding any button in the page context menu
    copyPageButton = pageContextMenu.querySelector('button');
  }
  if (!copyPageButton) {
    // Try finding by text content
    const allButtons = pageContextMenu.querySelectorAll('button');
    copyPageButton = Array.from(allButtons).find(btn => {
      const text = btn.textContent.toLowerCase();
      return text.includes('copy') || text.includes('page');
    });
  }
  
  if (copyPageButton) {
    // Modify the button using our function
    modifyCopyPageButton(copyPageButton);
    
    // Replace click handler to show cost estimator instead of copying
    // Remove existing event listeners by cloning and replacing
    const newButton = copyPageButton.cloneNode(true);
    
    // Re-apply modifications to cloned button (this will create SVG if missing)
    modifyCopyPageButton(newButton);
    
    // Verify SVG exists in cloned button before replacing
    const svgCheck = newButton.querySelector('svg');
    if (!svgCheck) {
      console.log('[Cost Estimator] WARNING: SVG missing in cloned button, creating it');
      const buttonDiv = newButton.querySelector('div.flex.items-center, div');
      if (buttonDiv) {
        const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        newSvg.setAttribute('width', '18');
        newSvg.setAttribute('height', '18');
        newSvg.setAttribute('viewBox', '0 0 18 18');
        newSvg.setAttribute('fill', 'none');
        newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        newSvg.setAttribute('class', 'w-4 h-4');
        
        const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dollarText.setAttribute('x', '9');
        dollarText.setAttribute('y', '13');
        dollarText.setAttribute('text-anchor', 'middle');
        dollarText.setAttribute('fill', 'currentColor');
        dollarText.setAttribute('font-size', '16');
        dollarText.setAttribute('font-weight', 'bold');
        dollarText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
        dollarText.textContent = '$';
        newSvg.appendChild(dollarText);
        
        buttonDiv.insertBefore(newSvg, buttonDiv.firstChild);
      }
    }
    
    copyPageButton.parentNode.replaceChild(newButton, copyPageButton);
    
    // Add click handler to show cost estimator
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show the cost estimator dropdown
      const dropdown = document.getElementById('cost-estimator-dropdown');
      if (dropdown) {
        toggleCostEstimatorDropdown();
      } else {
        // If dropdown doesn't exist, try to create it
        createOrUpdateDropdown().then(newDropdown => {
          if (newDropdown) {
            toggleCostEstimatorDropdown();
          }
        });
      }
    });
    
    // Set up MutationObserver to watch for button changes and re-apply modifications
    const buttonObserver = new MutationObserver((mutations) => {
      // Check for any button that contains "Copy" or "Page" text and hasn't been modified
      const allButtons = pageContextMenu.querySelectorAll('button');
      allButtons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if ((text.includes('copy') || text.includes('page')) && btn.dataset.pricingModified !== 'true') {
          console.log('[Cost Estimator] Found unmodified Copy page button, applying modifications');
          modifyCopyPageButton(btn);
          
          // Also replace click handler
          const newBtn = btn.cloneNode(true);
          modifyCopyPageButton(newBtn);
          btn.parentNode.replaceChild(newBtn, btn);
          
          newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = document.getElementById('cost-estimator-dropdown');
            if (dropdown) {
              toggleCostEstimatorDropdown();
            } else {
              createOrUpdateDropdown().then(newDropdown => {
                if (newDropdown) {
                  toggleCostEstimatorDropdown();
                }
              });
            }
          });
        }
      });
    });
    
    buttonObserver.observe(pageContextMenu, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'data-pricing-modified'],
      characterData: true
    });
    
    // Also check immediately in case button already exists
    setTimeout(() => {
      const existingButton = pageContextMenu.querySelector('button');
      if (existingButton && existingButton.dataset.pricingModified !== 'true') {
        const text = existingButton.textContent.toLowerCase();
        if (text.includes('copy') || text.includes('page')) {
          console.log('[Cost Estimator] Found existing unmodified button, applying modifications');
          modifyCopyPageButton(existingButton);
          const newBtn = existingButton.cloneNode(true);
          modifyCopyPageButton(newBtn);
          existingButton.parentNode.replaceChild(newBtn, existingButton);
          newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = document.getElementById('cost-estimator-dropdown');
            if (dropdown) {
              toggleCostEstimatorDropdown();
            } else {
              createOrUpdateDropdown().then(newDropdown => {
                if (newDropdown) {
                  toggleCostEstimatorDropdown();
                }
              });
            }
          });
        }
      }
    }, 100);
    
    console.log('[Cost Estimator] Copy page button modified to View Pricing');
  } else {
    console.log('[Cost Estimator] Copy page button not found, skipping button modification');
  }
  
  // Create or update dropdown with current page's pricing
  const dropdown = await createOrUpdateDropdown();
  if (!dropdown) {
    console.log('[Cost Estimator] Failed to create dropdown');
    return;
  }
  
  // Function to add menu item to the dropdown menu
  function addMenuItemToMenu() {
    const menuContent = findMenuContent();
    if (!menuContent) {
      console.log('[Cost Estimator] Menu content not found');
      return false;
    }
    
    // Check if menu item already exists
    if (document.getElementById('cost-estimator-menu-item')) {
      console.log('[Cost Estimator] Menu item already exists');
      return true;
    }
    
    // Look at existing menu items to match their structure exactly
    const existingMenuItem = menuContent.querySelector('[role="menuitem"]');
    
    console.log('[Cost Estimator] Existing menu items found:', menuContent.querySelectorAll('[role="menuitem"]').length);
    
    if (!existingMenuItem) {
      console.log('[Cost Estimator] No existing menu items found to copy structure from.');
      return false;
    }
    
    console.log('[Cost Estimator] Cloning existing menu item structure');
    
    // Clone the entire menu item structure exactly - this preserves all styling, spacing, etc.
    const menuItem = existingMenuItem.cloneNode(true);
    menuItem.id = 'cost-estimator-menu-item';
    
    // Replace the icon with dollar sign (keep exact same structure)
    const existingIcon = menuItem.querySelector('svg');
    if (existingIcon) {
      // Create dollar sign icon - revert to text-based, keep exact same attributes
      const dollarIcon = existingIcon.cloneNode(false);
      dollarIcon.innerHTML = '';
      
      const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      dollarText.setAttribute('x', '9');
      dollarText.setAttribute('y', '13');
      dollarText.setAttribute('text-anchor', 'middle');
      dollarText.setAttribute('fill', 'currentColor');
      dollarText.setAttribute('font-size', '16');
      dollarText.setAttribute('font-weight', 'bold');
      dollarText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      dollarText.textContent = '$';
      dollarIcon.appendChild(dollarText);
      
      existingIcon.parentNode.replaceChild(dollarIcon, existingIcon);
    }
    
    // Update text content - only update the title text, not the icon
    // Find spans that are NOT inside SVG elements
    const allSpans = Array.from(menuItem.querySelectorAll('span')).filter(span => {
      // Exclude spans inside SVG
      if (span.closest('svg')) {
        return false;
      }
      const text = span.textContent.trim();
      return text.length > 0 && !span.querySelector('span'); // Only direct text spans, not containers
    });
    
    // Replace first span with title (this should be "Copy page")
    if (allSpans.length > 0) {
      // Find the span that contains "Copy" or "page" text for the title
      const titleSpan = allSpans.find(span => {
        const text = span.textContent.trim().toLowerCase();
        return text.includes('copy') || text.includes('page');
      }) || allSpans[0];
      
      titleSpan.textContent = 'View Pricing';
      
      // Find and replace description - look for spans containing "Markdown" or "LLMs"
      const descriptionSpan = allSpans.find(span => {
        const text = span.textContent.trim().toLowerCase();
        return text.includes('markdown') || text.includes('llm') || text.includes('copy page as');
      });
      
      if (descriptionSpan) {
        descriptionSpan.textContent = 'Estimate API costs based on usage';
      } else {
        // Replace or add description from remaining spans
        const remainingSpans = allSpans.filter(s => s !== titleSpan);
        if (remainingSpans.length > 0) {
          remainingSpans[0].textContent = 'Estimate API costs based on usage';
        } else {
          // Find the text container and add description
          const textContainer = titleSpan.parentElement;
          if (textContainer) {
            const menuDescription = titleSpan.cloneNode(false);
            menuDescription.textContent = 'Estimate API costs based on usage';
            // Match description styling from other menu items if available
            const otherMenuItems = menuContent.querySelectorAll('[role="menuitem"]');
            if (otherMenuItems.length > 1) {
              const otherItem = otherMenuItems[1];
              const otherSpans = Array.from(otherItem.querySelectorAll('span')).filter(span => {
                if (span.closest('svg')) return false;
                const text = span.textContent.trim();
                return text.length > 0 && !span.querySelector('span');
              });
              if (otherSpans.length > 1) {
                menuDescription.className = otherSpans[1].className;
              }
            }
            textContainer.appendChild(menuDescription);
          }
        }
      }
    } else {
      // Fallback: find any text node (but not in SVG) and replace
      const walker = document.createTreeWalker(menuItem, NodeFilter.SHOW_TEXT);
      let node;
      let foundFirst = false;
      while (node = walker.nextNode()) {
        // Skip text nodes inside SVG
        if (node.parentElement && node.parentElement.closest('svg')) {
          continue;
        }
        const text = node.textContent.trim();
        if (text.length > 0) {
          const lowerText = text.toLowerCase();
          if (!foundFirst && (lowerText.includes('copy') || lowerText.includes('page'))) {
            node.textContent = 'View Pricing';
            foundFirst = true;
          } else if (lowerText.includes('markdown') || lowerText.includes('llm') || lowerText.includes('copy page as')) {
            // Found the description text
            node.textContent = 'Estimate API costs based on usage';
          }
        }
      }
    }
    
    // Add click handler
    menuItem.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Function to close menu and show cost estimator
      function closeMenuAndShowEstimator() {
        console.log('[Cost Estimator] closeMenuAndShowEstimator called');
        
        // Find and hide the menu content
        const menuContent = findMenuContent();
        if (menuContent) {
          menuContent.style.display = 'none';
          menuContent.style.visibility = 'hidden';
        }
        
        // Close the menu by clicking the button if it's open
        const moreActionsButton = pageContextMenu.querySelector('button[aria-haspopup="menu"], button[aria-expanded="true"]');
        if (moreActionsButton) {
          const isMenuOpen = moreActionsButton.getAttribute('aria-expanded') === 'true' || 
                             moreActionsButton.getAttribute('data-state') === 'open';
          
          if (isMenuOpen) {
            // Trigger click to close menu
            moreActionsButton.click();
          }
        }
        
        // Show cost estimator after a short delay to ensure menu closes and dropdown exists
        setTimeout(() => {
          const dropdown = document.getElementById('cost-estimator-dropdown');
          console.log('[Cost Estimator] Looking for dropdown after menu close...');
          console.log('[Cost Estimator] Dropdown found?', dropdown !== null);
          if (dropdown) {
            console.log('[Cost Estimator] Dropdown found, showing cost estimator');
            showCostEstimator();
          } else {
            console.log('[Cost Estimator] Dropdown not found when trying to show, checking pageContextMenu...');
            if (pageContextMenu) {
              console.log('[Cost Estimator] pageContextMenu children:', Array.from(pageContextMenu.children).map(c => c.id));
            }
            
            // Retry after another delay
            setTimeout(() => {
              const retryDropdown = document.getElementById('cost-estimator-dropdown');
              if (retryDropdown) {
                console.log('[Cost Estimator] Dropdown found on retry');
                showCostEstimator();
              } else {
                console.error('[Cost Estimator] Dropdown still not found after retry');
                // Try to recreate it with current page's pricing
                console.log('[Cost Estimator] Attempting to recreate dropdown with current page pricing...');
                createOrUpdateDropdown().then(newDropdown => {
                  if (newDropdown) {
                    console.log('[Cost Estimator] Dropdown recreated');
                    showCostEstimator();
                  }
                });
              }
            }, 200);
          }
        }, 200);
      }
      
      // Execute immediately
      closeMenuAndShowEstimator();
    });
    
    // Insert at the beginning of the menu (first menu item)
    const firstMenuItem = menuContent.querySelector('[role="menuitem"]');
    if (firstMenuItem) {
      menuContent.insertBefore(menuItem, firstMenuItem);
    } else {
      menuContent.appendChild(menuItem);
    }
    
    console.log('[Cost Estimator] Menu item added to DOM as first item. Menu state:', menuContent.getAttribute('data-state'));
    console.log('[Cost Estimator] Menu item element:', menuItem);
    console.log('[Cost Estimator] Total menu items now:', menuContent.querySelectorAll('[role="menuitem"]').length);
    return true;
  }
  
  // Watch for menu opening and add item when it opens
  const moreActionsButton = pageContextMenu.querySelector('button[aria-haspopup="menu"]');
  if (moreActionsButton) {
    const menuObserver = new MutationObserver(function(mutations) {
      if (moreActionsButton.getAttribute('aria-expanded') === 'true') {
        // Menu is open, try to add menu item
        setTimeout(() => {
          addMenuItemToMenu();
        }, 50); // Small delay to ensure menu content is rendered
      }
    });
    
    // Watch for menu content being added to DOM
    const menuContentObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1 && (
              node.getAttribute('role') === 'menu' ||
              node.querySelector && node.querySelector('[role="menu"]')
            )) {
              setTimeout(() => {
                addMenuItemToMenu();
              }, 50);
            }
          });
        }
      });
    });
    
    // Also watch for clicks on the more actions button
    moreActionsButton.addEventListener('click', function() {
      console.log('[Cost Estimator] More actions button clicked');
      // Try multiple times with increasing delays to catch the menu when it opens
      [50, 100, 200, 300].forEach(delay => {
        setTimeout(() => {
          console.log(`[Cost Estimator] Attempting to add menu item after ${delay}ms`);
          const added = addMenuItemToMenu();
          if (added) {
            console.log('[Cost Estimator] Menu item successfully added');
          }
        }, delay);
      });
    });
    
    menuObserver.observe(moreActionsButton, {
      attributes: true,
      attributeFilter: ['aria-expanded', 'data-state']
    });
    
    menuContentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Close dropdown when clicking outside
  const clickOutsideHandler = function(e) {
    const dropdown = document.getElementById('cost-estimator-dropdown');
    if (dropdownOpen && dropdown && !pageContextMenu.contains(e.target) && !dropdown.contains(e.target)) {
      toggleCostEstimatorDropdown();
    }
  };
  document.addEventListener('click', clickOutsideHandler);
  
  console.log('Cost estimator menu integration set up.');
  injected = true;
  
  if (typeof observer !== 'undefined') {
    observer.disconnect();
  }
  console.log('Injection complete, observer disconnected if exists.');
}

// Run immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState !== 'loading') {
  console.log('DOM already ready, running injectElement immediately.');
  injectElement().catch(err => console.error('Error in injectElement:', err));
} else {
  console.log('Waiting for DOMContentLoaded.');
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired.');
    injectElement().catch(err => console.error('Error in injectElement:', err));
  });
}

// Set up a MutationObserver to watch for changes in case of dynamic content
const observer = new MutationObserver(function(mutations) {
  // Check if URL changed (for client-side navigation)
  const currentUrl = window.location.pathname;
  if (window.lastInjectedUrl !== currentUrl) {
    injected = false;
    window.lastInjectedUrl = currentUrl;
    console.log('[Cost Estimator] URL changed, resetting injection state');
  }
  
  if (injected) {
    console.log('Already injected, ignoring mutation.');
    return;
  }
  
  let shouldInject = false;
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      Array.from(mutation.addedNodes).forEach(node => {
        if (node.id === 'api-playground-2-operation-page' || 
            node.id === 'page-context-menu' ||
            (node.querySelector && (
              node.querySelector('#api-playground-2-operation-page') ||
              node.querySelector('#page-context-menu') ||
              node.querySelector('[id^="radix-"][aria-haspopup="menu"]')
            ))) {
          shouldInject = true;
        }
      });
    }
  });
  
  if (shouldInject) {
    console.log('Relevant DOM mutation detected, attempting inject.');
    injectElement().catch(err => console.error('Error in injectElement:', err));
  }
});

// Also listen for popstate events (browser back/forward) and pushstate/replacestate (SPA navigation)
let lastPathname = window.location.pathname;
function checkNavigation() {
  const currentPathname = window.location.pathname;
  if (currentPathname !== lastPathname) {
    lastPathname = currentPathname;
    injected = false;
    window.lastInjectedUrl = currentPathname;
    console.log('[Cost Estimator] Navigation detected, resetting injection state');
    // Small delay to let the page render
    setTimeout(() => {
      injectElement().catch(err => console.error('Error in injectElement after navigation:', err));
    }, 100);
  }
}

window.addEventListener('popstate', checkNavigation);

// Override pushState and replaceState to detect SPA navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
  originalPushState.apply(history, arguments);
  setTimeout(checkNavigation, 0);
};

history.replaceState = function() {
  originalReplaceState.apply(history, arguments);
  setTimeout(checkNavigation, 0);
};

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('MutationObserver set up.');