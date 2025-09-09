import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repository } = await request.json();
    
    console.log('=== REPOSITORY DEBUG DATA ===');
    console.log('Full repository object:', JSON.stringify(repository, null, 2));
    console.log('Repository keys:', Object.keys(repository));
    console.log('Clone URL:', repository.clone_url);
    console.log('Links:', repository.links);
    console.log('Links clone:', repository.links?.clone);
    console.log('=== END DEBUG DATA ===');

    return NextResponse.json({
      success: true,
      repository: {
        name: repository.name,
        full_name: repository.full_name,
        clone_url: repository.clone_url,
        links: repository.links,
        keys: Object.keys(repository)
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
