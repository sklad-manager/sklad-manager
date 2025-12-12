import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        // Проверяем пароль из переменной окружения
        const correctPassword = process.env.AUTH_PASSWORD;

        if (!correctPassword) {
            return NextResponse.json(
                { error: 'Пароль не настроен на сервере' },
                { status: 500 }
            );
        }

        if (password === correctPassword) {
            // Создаем response с успешным статусом
            const response = NextResponse.json({ success: true });

            // Устанавливаем cookie для сессии
            response.cookies.set('auth-token', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 дней
                path: '/',
            });

            return response;
        } else {
            return NextResponse.json(
                { error: 'Неверный пароль' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}
