import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');

  if (authError?.code === 'refresh_token_not_found') {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name);
      }
    }
  }

  if (isAdminRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*'],
};
