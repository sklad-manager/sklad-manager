import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Получаем auth cookie
    const authToken = request.cookies.get('auth-token');

    // Проверяем, является ли путь публичным
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');
    const isPublicFile = request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/favicon.ico') ||
        request.nextUrl.pathname.startsWith('/icon-') ||
        request.nextUrl.pathname.startsWith('/manifest.json');

    // Если это публичный ресурс, пропускаем
    if (isPublicFile || isAuthApi) {
        return NextResponse.next();
    }

    // Если пользователь не авторизован
    if (!authToken || authToken.value !== 'authenticated') {
        // Если пытается зайти не на страницу логина - редиректим
        if (!isLoginPage) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    // Если авторизован и пытается зайти на страницу логина - редиректим на главную
    if (isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Авторизован и заходит на защищенную страницу - пропускаем
    return NextResponse.next();
}

// Применяем middleware ко всем путям
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image).*)',
    ],
};
