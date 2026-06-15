const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('사용법: node scratch/force_update_kbabsang.js <이미지_URL> <인스타_포스트_URL>');
    console.log('예시: node scratch/force_update_kbabsang.js "https://..." "https://www.instagram.com/p/..."');
    process.exit(1);
  }

  const [imageUrl, postUrl] = args;

  // .env.local에서 환경 변수 파싱
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local 파일이 존재하지 않습니다.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // API_URL 파싱
  const apiUrlMatch = envContent.match(/API_URL="([^"]+)"/) || envContent.match(/API_URL=([^\s]+)/);
  let nextApiUrl = apiUrlMatch ? apiUrlMatch[1] : 'http://localhost:3000/api/menu/kbabsang';
  
  // CRON_SECRET 파싱
  const cronSecretMatch = envContent.match(/CRON_SECRET="([^"]+)"/) || envContent.match(/CRON_SECRET=([^\s]+)/);
  const cronSecret = cronSecretMatch ? cronSecretMatch[1] : null;

  // URL 경로 보정
  if (nextApiUrl && !nextApiUrl.includes('/api/menu/')) {
    nextApiUrl = nextApiUrl.replace(/\/$/, '') + '/api/menu/kbabsang';
  }

  console.log(`대상 API URL: ${nextApiUrl}`);
  console.log(`이미지 URL: ${imageUrl.substring(0, 50)}...`);
  console.log(`포스트 URL: ${postUrl}`);

  // 오늘 날짜 구하기 (KST)
  const kstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const monthStr = String(kstDate.getMonth() + 1).padStart(2, '0');
  const dateStr = String(kstDate.getDate()).padStart(2, '0');
  const lastUpdated = `${year}-${monthStr}-${dateStr}`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  }

  const payload = {
    imageUrl,
    postUrl,
    lastUpdated,
  };

  console.log('API로 업데이트 요청을 전송하는 중...');
  const response = await fetch(nextApiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`API 응답 코드: ${response.status}`);
  console.log(`API 응답 내용: ${responseText}`);

  if (response.ok) {
    console.log(`K밥상 메뉴가 성공적으로 ${lastUpdated} 날짜로 강제 업데이트되었습니다!`);
  } else {
    console.error('업데이트에 실패했습니다.');
  }
}

main().catch(console.error);
