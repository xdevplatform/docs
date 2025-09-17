// Global variable to store pricing data
window.pricingData = {
    "eventTypePricing": {
        "Post": 0.005,
        "User": 0.01
    },
    "requestTypePricing": {
        "Write": 0.01
    },
    "defaultCost": 0.0
};

// // Fetch pricing data from X console API
// async function fetchPricingData() {
//   try {
//     const response = await fetch('https://console.x.com/api/credits/pricing', {
//       method: 'GET',
//       headers: {
//         'dtab-local': '/s/datadelivery-foundation/dev-portal-api:https=>/srv#/staging1/pdxa/datadelivery-foundation/dev-portal-api:https'
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log('Pricing data:', data);
    
//     // Set the global variable
//     window.pricingData = data;
    
//     return data;
//   } catch (error) {
//     console.error('Error fetching pricing data:', error);
//     window.pricingData = null;
//   }
// }

// Execute the function when the script loads
fetchPricingData();
