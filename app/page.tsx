"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Activity,
} from "lucide-react";

interface WebhookTest {
  id: string;
  url: string;
  statusCode: number | null;
  latency: number | null;
  timestamp: string;
  error?: string;
}

interface TestResponse {
  success: boolean;
  statusCode?: number;
  latency?: number;
  error?: string;
}

export default function WebhookTester() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tests, setTests] = useState<WebhookTest[]>([]);
  const [error, setError] = useState("");

  // Load tests from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("webhook-tests");
    if (saved) {
      setTests(JSON.parse(saved));
    }
  }, []);

  // Save tests to localStorage whenever they change
  useEffect(() => {
    if (tests.length > 0) {
      localStorage.setItem("webhook-tests", JSON.stringify(tests));
    }
  }, [tests]);

  // URL validation function to prevents crash from invalid URLs
  const isValidUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);

      // SSRF Protection to prevent calling internal/local addresses
      const hostname = urlObj.hostname.toLowerCase();
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

      // Check if hostname starts with blocked patterns
      if (
        blockedHosts.some(
          (blocked) =>
            hostname === blocked || hostname.startsWith(blocked + "."),
        )
      ) {
        return false;
      }

      // Check for private IP ranges
      if (hostname.match(/^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./)) {
        return false;
      }

      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Main test function: This simulates calling the backend API
  const testWebhook = async () => {
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError(
        "Invalid URL or blocked for security reasons (no localhost/private IPs)",
      );
      return;
    }

    setIsLoading(true);

    try {
      const startTime = performance.now();

      // Calling backend APIs
      const response = await fetch("/api/webhook-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const endTime = performance.now();
      const data: TestResponse = await response.json();

      // Create new test result
      const newTest: WebhookTest = {
        id: Date.now().toString(),
        url,
        statusCode: data.statusCode || null,
        latency: data.latency || Math.round(endTime - startTime),
        timestamp: new Date().toISOString(),
        error: data.error,
      };

      // This adds the test results to the begining of the array whilst keeping only the last 20 visible
      setTests((prev) => [newTest, ...prev].slice(0, 20));
      setUrl(""); // Clear input
    } catch (err) {
      // Handle any errors
      const newTest: WebhookTest = {
        id: Date.now().toString(),
        url,
        statusCode: null,
        latency: null,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown error occurred",
      };
      setTests((prev) => [newTest, ...prev].slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  };

  // Get status color based on HTTP status code
  const getStatusColor = (statusCode: number | null): string => {
    if (!statusCode) return "text-gray-500";
    if (statusCode >= 200 && statusCode < 300) return "text-green-200";
    if (statusCode >= 400 && statusCode < 600) return "text-gray-400";
    return "text-gray-500";
  };

  // Get status icon
  const getStatusIcon = (statusCode: number | null, error?: string) => {
    if (error) return <XCircle className="w-5 h-5" />;
    if (!statusCode) return <AlertCircle className="w-5 h-5" />;
    if (statusCode >= 200 && statusCode < 300)
      return <CheckCircle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const clearHistory = () => {
    setTests([]);
    localStorage.removeItem("webhook-tests");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 border-b border-white pb-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-8 h-8" />
            <h1 className="text-4xl font-bold tracking-tight">
              WEBHOOK TESTER
            </h1>
          </div>
          <p className="text-gray-400 text-sm tracking-wide uppercase">
            Test webhook endpoints · Monitor performance · Track history
          </p>
        </div>

        {/* Input Section */}
        <div className="border-2 border-white p-6 mb-8">
          <label className="block text-xs font-bold tracking-widest uppercase mb-3 text-gray-400">
            Target URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && testWebhook()}
              placeholder="https://webhook.site/your-unique-url"
              className="flex-1 bg-black border-2 border-white px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 font-mono text-sm transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={testWebhook}
              disabled={isLoading}
              className="bg-white hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-black px-8 py-3 font-bold tracking-wide uppercase text-sm flex items-center gap-3 transition-all border-2 border-white disabled:border-gray-800"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  TESTING
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  TEST
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-3 border border-white p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm font-mono">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="border-2 border-white">
          <div className="p-5 border-b-2 border-white flex justify-between items-center bg-white text-black">
            <h2 className="text-lg font-bold tracking-widest uppercase">
              Test History
            </h2>
            {tests.length > 0 && (
              <button
                onClick={clearHistory}
                className="hover:text-gray-600 flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                CLEAR
              </button>
            )}
          </div>

          {tests.length === 0 ? (
            <div className="p-16 text-center">
              <Send className="w-16 h-16 mx-auto mb-4 text-gray-800" />
              <p className="text-gray-600 uppercase tracking-wide text-sm font-bold">
                No tests recorded
              </p>
              <p className="text-gray-800 text-xs mt-2">
                Enter a URL above to begin testing
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-white">
              {tests.map((test, index) => (
                <div
                  key={test.id}
                  className="p-5 hover:bg-gray-950 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={getStatusColor(test.statusCode)}>
                          {getStatusIcon(test.statusCode, test.error)}
                        </div>
                        <code className="text-sm text-white font-mono truncate">
                          {test.url}
                        </code>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="border border-white p-2">
                          <div className="text-gray-600 uppercase tracking-wider font-bold mb-1">
                            Status
                          </div>
                          <div
                            className={`font-mono font-bold text-base ${getStatusColor(test.statusCode)}`}
                          >
                            {test.error ? "ERROR" : test.statusCode || "N/A"}
                          </div>
                        </div>

                        {test.latency && (
                          <div className="border border-white p-2">
                            <div className="text-gray-600 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Latency
                            </div>
                            <div className="text-white font-mono font-bold text-base">
                              {test.latency}ms
                            </div>
                          </div>
                        )}

                        <div className="border border-white p-2">
                          <div className="text-gray-600 uppercase tracking-wider font-bold mb-1">
                            Time
                          </div>
                          <div className="text-white font-mono text-xs">
                            {new Date(test.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      {test.error && (
                        <div className="mt-3 border border-white p-3 bg-white text-black">
                          <div className="text-xs font-bold tracking-wider mb-1">
                            ERROR MESSAGE
                          </div>
                          <div className="text-sm font-mono">{test.error}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {tests.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="border border-white p-4">
              <div className="text-2xl font-bold font-mono">{tests.length}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wider mt-1">
                Total Tests
              </div>
            </div>
            <div className="border border-white p-4">
              <div className="text-2xl font-bold font-mono">
                {
                  tests.filter(
                    (t) =>
                      t.statusCode && t.statusCode >= 200 && t.statusCode < 300,
                  ).length
                }
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wider mt-1">
                Successful
              </div>
            </div>
            <div className="border border-white p-4">
              <div className="text-2xl font-bold font-mono">
                {tests.filter((t) => t.latency).length > 0
                  ? Math.round(
                      tests
                        .filter((t) => t.latency)
                        .reduce((acc, t) => acc + (t.latency || 0), 0) /
                        tests.filter((t) => t.latency).length,
                    )
                  : 0}
                ms
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wider mt-1">
                Avg Latency
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
