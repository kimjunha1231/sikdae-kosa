import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'restaurants.json');

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read data file', e);
    return [];
  }
}

async function writeData(data: any) {
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write data file', e);
    return false;
  }
}

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

function getKSTDateString() {
  const d = new Date();
  // KST is UTC+9
  const kst = new Date(d.getTime() + (9 * 60 * 60 * 1000));
  return kst.toISOString().split('T')[0];
}

export async function GET() {
  const restaurants = await readData();
  
  if (!FIREBASE_DB_URL) {
    return NextResponse.json(restaurants);
  }

  try {
    // 1. Firebase에서 오늘 자 K밥상 메뉴 이미지 데이터 가져오기
    const res = await fetch(`${FIREBASE_DB_URL}/kbabsang/today.json`, {
      cache: 'no-store',
      // Timeout after 2 seconds to avoid blocking the main restaurants API if Firebase is slow
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      const todayStr = getKSTDateString();

      // 2. 오늘 날짜와 일치하는 메뉴가 등록되어 있는지 검증
      if (data && data.lastUpdated === todayStr && data.imageUrl) {
        const kIndex = restaurants.findIndex((r: any) => r.name === 'K밥상');
        if (kIndex !== -1) {
          // 3. K밥상의 대표 이미지 및 메뉴 데이터를 동적으로 교체
          restaurants[kIndex] = {
            ...restaurants[kIndex],
            image_url: data.imageUrl,
            menus: [
              {
                name: '오늘의 한식뷔페 (인스타 식단표)',
                price: 10000,
                imageUrl: data.imageUrl,
              }
            ],
            // 인스타그램 원본 링크도 필요하다면 metadata 등에 넣어두거나 활용 가능
            instagram_link: data.postUrl || null,
          };
        }
      }
    }
  } catch (error) {
    console.error('Failed to merge K-Babsang menu, returning original data:', error);
  }

  return NextResponse.json(restaurants);
}

export async function POST(request: Request) {
  try {
    const newRestaurant = await request.json();
    const restaurants = await readData();
    
    // Generate simple ID if not present
    if (!newRestaurant.id) {
      newRestaurant.id = Date.now().toString();
    }
    
    restaurants.unshift(newRestaurant);
    
    const success = await writeData(restaurants);
    if (success) {
      return NextResponse.json({ success: true, data: newRestaurant });
    }
    return NextResponse.json({ error: 'Failed to write database' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedRestaurant = await request.json();
    const restaurants = await readData();
    
    // We match by unique name and distance or dynamic id
    const index = restaurants.findIndex((r: any) => 
      (updatedRestaurant.id && r.id === updatedRestaurant.id) || 
      (!updatedRestaurant.id && r.name === updatedRestaurant.name && r.distance === updatedRestaurant.distance)
    );
    
    if (index !== -1) {
      restaurants[index] = { ...restaurants[index], ...updatedRestaurant };
      const success = await writeData(restaurants);
      if (success) {
        return NextResponse.json({ success: true, data: restaurants[index] });
      }
      return NextResponse.json({ error: 'Failed to save database' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name, distance, id } = await request.json();
    const restaurants = await readData();
    
    const initialLength = restaurants.length;
    const filtered = restaurants.filter((r: any) => 
      !((id && r.id === id) || (!id && r.name === name && r.distance === distance))
    );
    
    if (filtered.length < initialLength) {
      const success = await writeData(filtered);
      if (success) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Failed to write database' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
