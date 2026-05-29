/**
 * K-Babsang Instagram Menu Scraper (via RapidAPI Instagram Scraper)
 *
 * Uses RapidAPI's "Instagram API - Fast & Reliable Data Scraper" to fetch
 * the latest posts from @kbabsang_official (User ID: 23044319852).
 *
 * Flow:
 * 1. Fetch user feed via RapidAPI Feed endpoint
 * 2. Extract first post's image URL, caption, and shortcode
 * 3. Check if the caption contains today's date (KST)
 * 4. If today's post → send data to Next.js API → Firebase RTDB update
 */

async function scrapeKbabsang() {
  console.log('Starting K-Babsang menu scraping via RapidAPI Instagram Scraper...');

  const userId = '23044319852'; // kbabsang_official's permanent numeric user ID
  const apiEndpoint = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/feed?user_id=${userId}`;
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY is not defined in environment variables');
  }

  console.log('Fetching profile feed from RapidAPI...');
  const response = await fetch(apiEndpoint, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `RapidAPI responded with status: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const items = data.items;

  if (!items || items.length === 0) {
    throw new Error('No posts found in profile feed.');
  }

  // 2. Extract first (latest) post
  const firstPost = items[0];
  const caption = firstPost.caption?.text || firstPost.caption_text || (typeof firstPost.caption === 'string' ? firstPost.caption : '');
  const imageUrl = firstPost.image_versions2?.candidates?.[0]?.url || firstPost.thumbnail_url || firstPost.display_url || '';
  const code = firstPost.code || firstPost.shortcode || '';
  const postUrl = code ? `https://www.instagram.com/p/${code}/` : (firstPost.link || firstPost.url || '');

  console.log('=== Scraped Data ===');
  console.log('Post URL:', postUrl);
  console.log(
    'Image URL:',
    imageUrl ? imageUrl.substring(0, 120) + '...' : 'None'
  );
  console.log('Caption snippet:', caption.substring(0, 150) + '...');
  console.log('====================');

  if (!imageUrl) {
    throw new Error('Image URL was not found in the first post.');
  }

  // 3. Check if the post is for today (KST)
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getMonth() + 1;
  const date = kst.getDate();

  const datePatterns = [
    `${month}월\\s*${date}일`,
    `${month}/${date}`,
    `0${month}\\.0${date}`,
    `0${month}\\.${date}`,
    `${month}\\.0${date}`,
    `${month}\\.${date}`,
  ];

  let isTodayPost = false;
  for (const pattern of datePatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(caption)) {
      isTodayPost = true;
      console.log(`Matched date pattern in caption: "${pattern}"`);
      break;
    }
  }

  if (!isTodayPost) {
    console.log(
      `Today's date (${month}/${date}) was not found in the post caption.`
    );
    // Allow forcing bypass for manual local testing if FORCED_UPDATE env var is set
    if (process.env.FORCED_UPDATE === 'true') {
      console.log('FORCED_UPDATE is true. Bypassing date check...');
    } else {
      console.log('Assuming this post is older. Skipping Firebase update.');
      return;
    }
  }

  // 4. Send update to Next.js API
  console.log("Sending update to Next.js API...");
  let nextApiUrl = process.env.API_URL || 'http://localhost:3000/api/menu/kbabsang';
  
  // If API_URL is just the base URL, append the API route path automatically
  if (nextApiUrl && !nextApiUrl.includes('/api/menu/')) {
    nextApiUrl = nextApiUrl.replace(/\/$/, '') + '/api/menu/kbabsang';
  }
  
  console.log(`Target API URL: ${nextApiUrl}`);
  const cronSecret = process.env.CRON_SECRET;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  }

  const payload = {
    imageUrl,
    postUrl,
    lastUpdated: kst.toISOString().split('T')[0],
  };

  const apiResponse = await fetch(nextApiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await apiResponse.text();
  console.log(`API response status: ${apiResponse.status}`);
  console.log(`API response body: ${responseText}`);

  if (!apiResponse.ok) {
    throw new Error(
      `API server responded with error: ${apiResponse.status}`
    );
  }

  console.log('Successfully updated K-Babsang menu!');
}

scrapeKbabsang().catch((error) => {
  console.error('Failed to execute scraping:', error);
  process.exit(1);
});
