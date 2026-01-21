import { NextRequest, NextResponse } from "next/server";

interface TestRequest {
  url: string;
}

interface TestResponse {
  success: boolean;
  statusCode?: number;
  latency?: number;
  error?: string;
  message?: string;
}

function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback addresses
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "0:0:0:0:0:0:0:1",
    ];

    if (blockedHosts.includes(hostname)) {
      return true;
    }

    // Block private IP ranges
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fd00:/, // IPv6 private
    ];

    if (privateIPPatterns.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TestRequest;
    const { url } = body;

    // Check if URL is provided
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          error: "URL is required and must be a string",
        } as TestResponse,
        { status: 400 },
      );
    }

    // Check URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid URL format",
        } as TestResponse,
        { status: 400 },
      );
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only HTTP and HTTPS protocols are allowed",
        } as TestResponse,
        { status: 400 },
      );
    }

    // SSRF Protection
    if (isInternalUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access to internal/private URLs is not allowed",
        } as TestResponse,
        { status: 403 },
      );
    }

    // Prepare the test payload
    const payload = {
      event: "test_ping",
      timestamp: new Date().toISOString(),
      source: "webhook_tester",
      test_id: Math.random().toString(36).substring(7),
    };

    // Record start time (Latency)
    const startTime = Date.now();

    // Make the actual HTTP POST request to the webhook URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "WebhookTester/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Measure latency: Calculate time taken
      const endTime = Date.now();
      const latency = endTime - startTime;

      clearTimeout(timeout);

      // Return success response with metrics
      return NextResponse.json({
        success: true,
        statusCode: response.status,
        latency,
        message: `Webhook responded with ${response.status}`,
      } as TestResponse);
    } catch (fetchError) {
      clearTimeout(timeout);

      // Handle different types of errors
      if (fetchError instanceof Error) {
        // Timeout error
        if (fetchError.name === "AbortError") {
          return NextResponse.json({
            success: false,
            error: "Request timeout (>10s)",
          } as TestResponse);
        }

        // Network error
        if (fetchError.message.includes("fetch failed")) {
          return NextResponse.json({
            success: false,
            error: "Network error: Could not reach the URL",
          } as TestResponse);
        }

        // Other errors
        return NextResponse.json({
          success: false,
          error: `Request failed: ${fetchError.message}`,
        } as TestResponse);
      }

      // Unknown error
      return NextResponse.json({
        success: false,
        error: "Unknown error occurred",
      } as TestResponse);
    }
  } catch (error) {
    console.error("Webhook test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as TestResponse,
      { status: 500 },
    );
  }
}
