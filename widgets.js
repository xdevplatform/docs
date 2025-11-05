// DEPRECATED: This script has been replaced by React components in snippets/broadcast-card.mdx and snippets/broadcast-carousel.mdx
// The livestreams.mdx page now uses these components directly instead of dynamic DOM manipulation.
// This file is kept for reference but is no longer needed for the livestreams page functionality.

// Simple custom Twitter/X broadcast link script
// Creates clickable cards linking to broadcasts (avoiding 429 rate limits)

(function() {
  console.log('X broadcast link script starting...');
  
  var processedElements = new WeakSet(); // Track processed elements
  
  function extractBroadcastId(url) {
    // Extract broadcast ID from URL
    var match = url.match(/\/i\/broadcasts\/([^\/\?#]+)/);
    return match ? match[1] : null;
  }
  
  function isBroadcastLink(url) {
    // Check if URL is a broadcast link
    return /\/i\/broadcasts\//.test(url);
  }
  
  function createBroadcastCard(url, container, title, targetContainer) {
    // Mark as processed immediately
    processedElements.add(container);
    
    var broadcastId = extractBroadcastId(url);
    if (!broadcastId) {
      console.warn('Could not extract broadcast ID from:', url);
      return;
    }
    
    // Create a nice card linking to the broadcast
    var card = document.createElement('a');
    card.href = url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.display = 'block';
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';
    card.style.margin = '1em 0';
    card.style.maxWidth = '480px';
    card.style.marginLeft = '0';
    card.style.marginRight = 'auto';
    card.style.borderRadius = '12px';
    card.style.overflow = 'hidden';
    card.style.backgroundColor = '#000';
    card.style.border = '1px solid #333';
    card.style.transition = 'transform 0.2s, box-shadow 0.2s';
    
    // Hover effect
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
    
    // Create preview container with default thumbnail
    var previewContainer = document.createElement('div');
    previewContainer.style.position = 'relative';
    previewContainer.style.width = '100%';
    previewContainer.style.paddingTop = '56.25%'; // 16:9 aspect ratio
    previewContainer.style.background = 'linear-gradient(135deg, #0f0f0f 0%, #050505 100%)'; // Very dark gray gradient for black background
    previewContainer.style.backgroundSize = 'cover';
    previewContainer.style.backgroundPosition = 'center';
    previewContainer.style.overflow = 'hidden';
    
    // Create logo container (offset position)
    var logoContainer = document.createElement('div');
    logoContainer.style.position = 'absolute';
    logoContainer.style.bottom = '-14%';
    logoContainer.style.left = '-7%';
    logoContainer.style.width = '400px';
    logoContainer.style.height = '400px';
    logoContainer.style.opacity = '0.15';
    
    // Create SVG logo
    var logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    logoSvg.setAttribute('width', '400');
    logoSvg.setAttribute('height', '400');
    logoSvg.setAttribute('viewBox', '0 0 1200 1227');
    logoSvg.setAttribute('fill', 'none');
    logoSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    var logoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    logoPath.setAttribute('d', 'M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z');
    logoPath.setAttribute('fill', 'white');
    
    logoSvg.appendChild(logoPath);
    logoContainer.appendChild(logoSvg);
    
    // Create overlay with play button
    var overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = '#fff';
    overlay.style.cursor = 'pointer';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.3)';
    
    // Play icon container
    var playIconContainer = document.createElement('div');
    playIconContainer.style.width = '80px';
    playIconContainer.style.height = '80px';
    playIconContainer.style.borderRadius = '50%';
    playIconContainer.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
    playIconContainer.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    playIconContainer.style.display = 'flex';
    playIconContainer.style.alignItems = 'center';
    playIconContainer.style.justifyContent = 'center';
    playIconContainer.style.marginBottom = '16px';
    playIconContainer.style.transition = 'transform 0.2s';
    
    var playIcon = document.createElement('div');
    playIcon.innerHTML = '▶';
    playIcon.style.fontSize = '32px';
    playIcon.style.color = '#ffffff';
    playIcon.style.marginLeft = '4px';
    playIconContainer.appendChild(playIcon);
    
    card.addEventListener('mouseenter', function() {
      playIconContainer.style.transform = 'scale(1.1)';
    });
    card.addEventListener('mouseleave', function() {
      playIconContainer.style.transform = 'scale(1)';
    });
    
    overlay.appendChild(playIconContainer);
    previewContainer.appendChild(logoContainer);
    previewContainer.appendChild(overlay);
    card.appendChild(previewContainer);
    
    // Add title if provided
    if (title) {
      var titleContainer = document.createElement('div');
      titleContainer.style.padding = '16px 20px';
      titleContainer.style.backgroundColor = '#000';
      titleContainer.style.borderTop = '1px solid #333';
      
      // Parse title and date (date is in parentheses)
      var titleText = title;
      var dateText = null;
      var dateMatch = title.match(/\(([^)]+)\)$/);
      if (dateMatch) {
        dateText = dateMatch[1];
        titleText = title.replace(/\s*\([^)]+\)$/, '').trim();
      }
      
      // Title element
      var titleElement = document.createElement('div');
      titleElement.style.color = '#fff';
      titleElement.style.fontSize = '16px';
      titleElement.style.fontWeight = '600';
      titleElement.style.lineHeight = '1.4';
      titleElement.style.marginBottom = dateText ? '4px' : '0';
      titleElement.textContent = titleText;
      titleContainer.appendChild(titleElement);
      
      // Date element (if date found)
      if (dateText) {
        var dateElement = document.createElement('div');
        dateElement.style.color = '#999';
        dateElement.style.fontSize = '14px';
        dateElement.style.fontWeight = '400';
        dateElement.style.lineHeight = '1.4';
        dateElement.textContent = dateText;
        titleContainer.appendChild(dateElement);
      }
      
      card.appendChild(titleContainer);
    }
    
    // Append the card to target container or original container
    if (targetContainer) {
      // Update card styles for carousel
      card.style.flexShrink = '0';
      card.style.width = '480px';
      card.style.maxWidth = '480px';
      card.style.margin = '0';
      targetContainer.appendChild(card);
    } else {
      // Append to original container
      container.innerHTML = '';
      container.appendChild(card);
    }
    
    // Clean up original container if using target
    if (targetContainer) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
    
    console.log('Broadcast card created for:', url);
    return card;
  }
  
  function parseDate(dateString) {
    // Parse date string like "September 25, 2025"
    var months = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    var parts = dateString.match(/(\w+)\s+(\d+),\s+(\d+)/);
    if (parts) {
      return new Date(parseInt(parts[3]), months[parts[1]], parseInt(parts[2]));
    }
    return null;
  }
  
  function formatMonthYear(date) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + ' ' + date.getFullYear();
  }
  
  function embedTweets() {
    var tweetDivs = document.querySelectorAll('div.twitter-tweet');
    console.log('Found', tweetDivs.length, 'div.twitter-tweet elements');
    
    // First pass: collect all broadcast cards with their dates
    var broadcasts = [];
    
    tweetDivs.forEach(function(div, index) {
      // Skip if already processed
      if (processedElements.has(div)) {
        return;
      }
      
      // Check if we already created a card
      if (div.querySelector('a[href*="broadcasts"][target="_blank"]')) {
        var existingCard = div.querySelector('div[style*="position: relative"]');
        if (existingCard) {
          processedElements.add(div);
          return;
        }
      }
      
      // Find the anchor tag
      var anchor = div.querySelector('a');
      if (!anchor || !anchor.href) {
        return;
      }
      
      var url = anchor.href;
      
      // Only handle broadcast links
      if (isBroadcastLink(url)) {
        // Find the previous h3 element (title)
        var title = null;
        var prevElement = div.previousElementSibling;
        while (prevElement) {
          if (prevElement.tagName === 'H3') {
            title = prevElement.textContent.trim();
            break;
          }
          prevElement = prevElement.previousElementSibling;
        }
        
        // Extract date from title
        var date = null;
        var dateMatch = title ? title.match(/\(([^)]+)\)$/) : null;
        if (dateMatch) {
          date = parseDate(dateMatch[1]);
        }
        
        broadcasts.push({
          div: div,
          url: url,
          title: title,
          date: date
        });
      }
    });
    
    // Sort by date (newest first)
    broadcasts.sort(function(a, b) {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date - a.date;
    });
    
    // Find the "Past Broadcasts" heading and create carousel container after it
    var carouselContainer = null;
    
    // First, check if a carousel container already exists
    var existingCarousel = document.querySelector('[data-broadcast-carousel="true"]');
    if (existingCarousel) {
      console.log('Reusing existing carousel container');
      carouselContainer = existingCarousel;
    } else {
      var headings = document.querySelectorAll('h2');
      var pastBroadcastsHeading = null;
      
      console.log('Looking for "Past Broadcasts" heading. Found', headings.length, 'h2 elements');
      
      for (var i = 0; i < headings.length; i++) {
        var headingText = headings[i].textContent.trim();
        console.log('Checking h2:', headingText);
        if (headingText === 'Past Broadcasts' || headingText.includes('Past Broadcasts')) {
          pastBroadcastsHeading = headings[i];
          console.log('Found "Past Broadcasts" heading!');
          break;
        }
      }
      
      if (!pastBroadcastsHeading) {
        console.warn('Could not find "Past Broadcasts" heading');
      }
      
      if (pastBroadcastsHeading && broadcasts.length > 0) {
        console.log('Creating carousel container with', broadcasts.length, 'broadcasts');
        carouselContainer = document.createElement('div');
        carouselContainer.setAttribute('data-broadcast-carousel', 'true');
        carouselContainer.style.display = 'flex';
        carouselContainer.style.overflowX = 'auto';
        carouselContainer.style.overflowY = 'hidden';
        carouselContainer.style.gap = '20px';
        carouselContainer.style.padding = '20px 0';
        carouselContainer.style.scrollBehavior = 'smooth';
        carouselContainer.style.webkitOverflowScrolling = 'touch';
        // Hide scrollbar but keep functionality
        carouselContainer.style.scrollbarWidth = 'thin';
        carouselContainer.style.scrollbarColor = '#333 transparent';
        
        // Insert carousel container after the "Past Broadcasts" heading
        // Find the next element sibling or insert after the heading
        var nextElement = pastBroadcastsHeading.nextElementSibling;
        if (nextElement) {
          pastBroadcastsHeading.parentNode.insertBefore(carouselContainer, nextElement);
        } else {
          pastBroadcastsHeading.parentNode.appendChild(carouselContainer);
        }
        console.log('Carousel container inserted');
      } else {
        console.warn('Cannot create carousel: heading found =', !!pastBroadcastsHeading, ', broadcasts =', broadcasts.length);
      }
    }
    
    // Render broadcasts in carousel
    var embedded = 0;
    
    if (!carouselContainer) {
      console.warn('No carousel container available, skipping card creation');
      return embedded;
    }
    
    broadcasts.forEach(function(broadcast) {
      // Skip if already processed
      if (processedElements.has(broadcast.div)) {
        console.log('Skipping already processed broadcast:', broadcast.url);
        return;
      }
      
      // Check if a card for this URL already exists in the carousel
      var existingCard = carouselContainer.querySelector('a[href="' + broadcast.url + '"]');
      if (existingCard) {
        console.log('Card already exists in carousel for:', broadcast.url);
        processedElements.add(broadcast.div);
        return;
      }
      
      // Hide the original h3
      var prevElement = broadcast.div.previousElementSibling;
      while (prevElement) {
        if (prevElement.tagName === 'H3') {
          prevElement.style.display = 'none';
          break;
        }
        prevElement = prevElement.previousElementSibling;
      }
      
      console.log('Creating broadcast card for:', broadcast.url);
      createBroadcastCard(broadcast.url, broadcast.div, broadcast.title, carouselContainer);
      
      embedded++;
    });
    
    if (embedded > 0) {
      console.log('Created', embedded, 'broadcast card(s)...');
    } else {
      console.warn('No broadcast cards created. Found', tweetDivs.length, 'tweet divs');
    }
    
    return embedded;
  }
  
  var observerDisconnected = false;
  
  // Try multiple times with delays to catch dynamically loaded content
  function tryEmbedding() {
    var result = embedTweets();
    if (result === 0) {
      // If no elements found, try again after a delay
      setTimeout(function() {
        console.log('Retrying embed after delay...');
        embedTweets();
      }, 1000);
    }
  }
  
  // Try immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      tryEmbedding();
    });
  } else {
    tryEmbedding();
  }
  
  // Also try after window load
  window.addEventListener('load', function() {
    setTimeout(function() {
      console.log('Trying embed after window load...');
      embedTweets();
    }, 500);
  });
  
  // Also watch for dynamically added content
  if (window.MutationObserver && !observerDisconnected) {
    var observer = new MutationObserver(function(mutations) {
      if (observerDisconnected) {
        return;
      }
      
      var shouldCheck = false;
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('div.twitter-tweet')) {
              shouldCheck = true;
            } else if (node.querySelector && node.querySelector('div.twitter-tweet')) {
              shouldCheck = true;
            }
          }
        });
      });
      
      if (shouldCheck) {
        embedTweets();
      }
    });
    
    var target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true
      });
      
      setTimeout(function() {
        observer.disconnect();
        observerDisconnected = true;
      }, 5000);
    }
  }
  
  console.log('X broadcast link script initialized');
})();
