/**
 * K-Babsang Instagram Menu Scraper (via Instagram Web API)
 *
 * Uses Instagram's internal web_profile_info API to fetch the latest post
 * from @kbabsang_official. No browser (Playwright) required.
 *
 * This API endpoint returns JSON data for public profiles when called with
 * the correct headers (x-ig-app-id, sec-fetch-* headers).
 *
 * Flow:
 * 1. Fetch profile data via Instagram Web API
 * 2. Extract first post's image URL and caption
 * 3. Check if the caption contains today's date (KST)
 * 4. If today's post → send data to Next.js API → Firebase RTDB update
 */

async function scrapeKbabsang() {
  console.log('Starting K-Babsang menu scraping via Instagram Web API...');

  // 1. Fetch profile data
  const apiEndpoint =
    'https://www.instagram.com/api/v1/users/web_profile_info/?username=kbabsang_official';

  console.log('Fetching profile data...');
  const response = await fetch(apiEndpoint, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-ig-app-id': '936619743392459',
      'x-requested-with': 'XMLHttpRequest',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      Referer: 'https://www.instagram.com/kbabsang_official/',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Instagram API responded with status: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const edges = data.data?.user?.edge_owner_to_timeline_media?.edges;

  if (!edges || edges.length === 0) {
    throw new Error('No posts found in profile data.');
  }

  // 2. Extract first (latest) post
  const firstPost = edges[0].node;
  const caption =
    firstPost.edge_media_to_caption?.edges?.[0]?.node?.text || '';
  const imageUrl = firstPost.display_url || firstPost.thumbnail_src || '';
  const shortcode = firstPost.shortcode;
  const postUrl = `https://www.instagram.com/p/${shortcode}/`;

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
    console.log('Assuming this post is older. Skipping Firebase update.');
    return;
  }

  // 4. Send update to Next.js API
  console.log("Today's post confirmed! Sending update to Next.js API...");
  const nextApiUrl =
    process.env.API_URL || 'http://localhost:3000/api/menu/kbabsang';
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
