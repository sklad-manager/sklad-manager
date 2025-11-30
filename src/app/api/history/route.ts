import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const slotId = searchParams.get('slotId');

        const where = slotId ? { slotId } : {};

        const history = await (prisma as any).actionHistory.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        return NextResponse.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
