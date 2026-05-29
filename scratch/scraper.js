const { chromium } = require('playwright');

async function scrapeInstagram() {
  console.log('Starting Instagram scraping task...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to https://www.instagram.com/kbabsang_official/ ...');
    // Go to the target profile page
    await page.goto('https://www.instagram.com/kbabsang_official/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log('Waiting for grid posts to load (attached in DOM)...');
    // Profile pages contain anchors pointing to post paths like /p/xxxx/
    try {
      // Use state: 'attached' because posts are loaded in the background DOM,
      // even if the login popup covers them visually. We support both regular posts (/p/) and Reels (/reel/).
      await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { state: 'attached', timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for posts grid. Capturing diagnostic HTML and screenshot...');
      const currentUrl = page.url();
      console.log('Current URL is:', currentUrl);

      // Save screenshot for debugging inside workspace scratch directory
      await page.screenshot({ path: 'scratch/error_screenshot.png', fullPage: true });
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('scratch/error_html.html', html);
      console.log('Saved debug HTML to scratch/error_html.html');

      throw new Error(`Instagram blocked request or redirected. Current URL: ${currentUrl}. Saved debug files.`);
    }

    const firstPost = page.locator('a[href*="/p/"], a[href*="/reel/"]').first();
    const postUrlSuffix = await firstPost.getAttribute('href');
    const postUrl = `https://www.instagram.com${postUrlSuffix}`;

    // Locate the thumbnail image inside the first post link
    const imgElement = firstPost.locator('img');
    const imageUrl = await imgElement.getAttribute('src');
    const caption = await imgElement.getAttribute('alt') || '';

    console.log('=== Scraped Data ===');
    console.log('Post URL:', postUrl);
    console.log('Image URL:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'None');
    console.log('Caption snippet:', caption.substring(0, 150) + '...');
    console.log('====================');

    if (!imageUrl) {
      throw new Error('Image URL was not found in the first post.');
    }

    // 1. Calculate today's date in Korean Standard Time (KST)
    const d = new Date();
    // KST is UTC+9
    const kst = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    const month = kst.getMonth() + 1;
    const date = kst.getDate();

    // Regular expression patterns to identify if the post is for today's menu
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
      console.log(`Today's date (${month}/${date}) was not found in the post caption.`);
      console.log('Assuming this post is older. Skipping Firebase update.');
      await browser.close();
      return;
    }

    console.log('Today\'s post confirmed! Sending update to Next.js API...');
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api/menu/kbabsang';
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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`API response status: ${response.status}`);
    console.log(`API response body: ${responseText}`);

    if (!response.ok) {
      throw new Error(`API server responded with error: ${response.status}`);
    }

    console.log('Successfully updated K-Babsang menu!');

  } catch (error) {
    console.error('Failed to execute scraping:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

scrapeInstagram();
