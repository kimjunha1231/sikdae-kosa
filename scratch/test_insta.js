const fs = require('fs');
const path = require('path');

async function main() {
  // .env.local에서 RAPIDAPI_KEY 읽기
  const envPath = path.join(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/RAPIDAPI_KEY="([^"]+)"/);
  
  if (!match) {
    console.error('RAPIDAPI_KEY not found in .env.local');
    process.exit(1);
  }
  
  const rapidApiKey = match[1];
  const userId = '23044319852';
  const apiEndpoint = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/feed?user_id=${userId}`;
  
  console.log('Fetching feed from RapidAPI...');
  const response = await fetch(apiEndpoint, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error(`Error fetching feed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  
  const data = await response.json();
  const items = data.items || [];
  console.log(`Found ${items.length} items.`);
  
  items.slice(0, 5).forEach((item, index) => {
    const caption = item.caption?.text || item.caption_text || (typeof item.caption === 'string' ? item.caption : '');
    const code = item.code || item.shortcode || '';
    const takenAt = item.taken_at || item.device_timestamp || 'N/A';
    
    // timestamp를 읽기 쉬운 시간으로 변환
    let dateObj = 'N/A';
    if (takenAt !== 'N/A') {
      dateObj = new Date(takenAt * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }
    
    console.log(`\n--- Item [${index}] ---`);
    console.log(`Code: ${code}`);
    console.log(`Taken At (KST): ${dateObj} (${takenAt})`);
    console.log(`Caption (first 100 chars): ${caption.substring(0, 100).replace(/\n/g, ' ')}`);
  });
}

main().catch(console.error);
