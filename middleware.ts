import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/app/(auth)/auth.config";

const authMiddleware = NextAuth(authConfig).auth;

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin"); // e.g., 'proxlyapp://' or null

  // --- CORS Preflight Handling for API routes ---
  if (
    request.method === "OPTIONS" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const preflightResponse = new NextResponse(null, { status: 204 });

    // Dynamically set ACAH based on the request's origin
    if (origin) {
      preflightResponse.headers.set("Access-Control-Allow-Origin", origin);
    }
    // Note: If origin is null (e.g. server-to-server or some non-standard clients),
    // this header might not be strictly necessary or might be 'null'.
    // Browsers making CORS requests always send an Origin.

    preflightResponse.headers.set("Access-Control-Allow-Credentials", "true");
    preflightResponse.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    // Reflect the headers requested by the client via Access-Control-Request-Headers
    const requestHeaders = request.headers.get(
      "Access-Control-Request-Headers"
    );
    if (requestHeaders) {
      preflightResponse.headers.set(
        "Access-Control-Allow-Headers",
        requestHeaders
      );
    }
    // Add Vary header to indicate that the response might vary based on the Origin.
    preflightResponse.headers.set(
      "Vary",
      "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    );

    return preflightResponse;
  }

  // --- Authentication and Actual Request Handling ---
  const authResponseOrRequest = await authMiddleware(request as any, {} as any);

  let response;
  if (authResponseOrRequest instanceof NextResponse) {
    // If NextAuth returned a response (e.g., redirect, error), use it
    response = authResponseOrRequest;
  } else {
    // If NextAuth allowed the request, proceed to the route handler by creating a base response
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  // --- Append CORS headers to actual API responses (non-preflight) ---
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Dynamically set ACAH for the actual response
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Credentials", "true");
    // Vary header for the actual response too
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export const config = {
  // Apply this middleware to all matched routes
  matcher: ["/", "/:id", "/api/:path*", "/login", "/register"],
};
