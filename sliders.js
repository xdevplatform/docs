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
  
  // Find the page context menu button
  const moreActionsButton = document.querySelector('[id^="radix-"][aria-haspopup="menu"]');
  if (!moreActionsButton) {
    console.log('More actions button not found, skipping.');
    return;
  }
  
  console.log('More actions button found, setting up cost estimator menu item.');
  
  // Create the cost estimator dropdown container (positioned relative to page context menu)
  const pageContextMenu = document.getElementById('page-context-menu');
  if (!pageContextMenu) {
    console.log('Page context menu not found, skipping.');
    return;
  }
  
  // Create or update dropdown with current page's pricing
  const dropdown = await createOrUpdateDropdown();
  if (!dropdown) {
    console.log('[Cost Estimator] Failed to create dropdown');
    return;
  }
  
  // Function to add menu item when menu opens
  function addMenuItemToMenu() {
    console.log('[Cost Estimator] addMenuItemToMenu called');
    const menuContent = findMenuContent();
    if (!menuContent) {
      console.log('[Cost Estimator] Menu content not found');
      return false;
    }
    
    console.log('[Cost Estimator] Menu content found:', menuContent);
    
    // Check if already added
    if (menuContent.querySelector('#cost-estimator-menu-item')) {
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
      dollarText.setAttribute('font-size', '14');
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
      
      titleSpan.textContent = 'Cost Estimator';
      
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
            node.textContent = 'Cost Estimator';
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
        
        // Check if dropdown exists before closing menu
        let dropdown = document.getElementById('cost-estimator-dropdown');
        console.log('[Cost Estimator] Dropdown exists before menu close?', dropdown !== null);
        if (dropdown) {
          console.log('[Cost Estimator] Dropdown parent:', dropdown.parentElement);
        }
        
        // Find and hide the menu content
        const menuContent = findMenuContent();
        if (menuContent) {
          menuContent.style.display = 'none';
          menuContent.style.visibility = 'hidden';
        }
        
        // Close the menu by clicking the button if it's open
        const isMenuOpen = moreActionsButton.getAttribute('aria-expanded') === 'true' || 
                           moreActionsButton.getAttribute('data-state') === 'open';
        
        if (isMenuOpen) {
          // Trigger click to close menu
          moreActionsButton.click();
        }
        
        // Show cost estimator after a short delay to ensure menu closes and dropdown exists
        setTimeout(() => {
          dropdown = document.getElementById('cost-estimator-dropdown');
          console.log('[Cost Estimator] Looking for dropdown after menu close...');
          console.log('[Cost Estimator] Dropdown found?', dropdown !== null);
          if (dropdown) {
            console.log('[Cost Estimator] Dropdown found, showing cost estimator');
            showCostEstimator();
          } else {
            console.log('[Cost Estimator] Dropdown not found when trying to show, checking pageContextMenu...');
            const pageContextMenu = document.getElementById('page-context-menu');
            console.log('[Cost Estimator] pageContextMenu exists?', pageContextMenu !== null);
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
    
    // Insert at the end of the menu
    menuContent.appendChild(menuItem);
    
    console.log('[Cost Estimator] Menu item added to DOM. Menu state:', menuContent.getAttribute('data-state'));
    console.log('[Cost Estimator] Menu item element:', menuItem);
    console.log('[Cost Estimator] Total menu items now:', menuContent.querySelectorAll('[role="menuitem"]').length);
    return true;
  }
  
  // Watch for menu opening and add item when it opens
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
  
  // Close dropdown when clicking outside
  const clickOutsideHandler = function(e) {
    if (dropdownOpen && !pageContextMenu.contains(e.target) && !dropdown.contains(e.target)) {
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

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('MutationObserver set up.');