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

export async function GET() {
  const restaurants = await readData();
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
