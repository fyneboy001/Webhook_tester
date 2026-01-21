**Webhook Tester**
This is a simple tool built for the Cencori technical challenge. It allows you to "ping" a URL to see if it's working, check how long the request takes, and see the status code returned.

Live Demo: webhooktester-xi.vercel.app

**Features:**
Tests Endpoints: Sends a POST request with a test JSON payload to any URL you provide.

Measures Latency: Shows exactly how many milliseconds the response took.

Saves History: Your recent tests are saved in your browser so they don't disappear when you refresh.

Safety First: I've added logic to prevent the app from calling internal IP addresses (SSRF protection) and to stop requests that take longer than 5 seconds.

**Tech Stack**
Framework: Next.js (App Router)

Language: TypeScript

Styling: Tailwind CSS

**How to run it**
Clone this repo.

Install the packages:

Bash
npm install
Start the development server:

Bash
npm run dev
Open http://localhost:3000 in your browser.

**Implementation Details**
Server-Side Execution: The actual "ping" happens on the server to avoid CORS issues and protect the user's client IP.

Timeout Handling: Used AbortController in the fetch request to ensure the serverless function doesn't hang indefinitely.

Input Validation: Built-in checks to ensure only valid URLs are processed, reducing unnecessary API calls.

Error Handling: If a site is down or the URL is wrong, the app shows a clear error message instead of crashing.

UX: Includes loading states so the user knows the request is "in-flight."
