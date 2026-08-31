#!/usr/bin/env python3
"""
QuoteCraft Pro — Gmail API OAuth2 Token Generator
This script helps you obtain a Google OAuth2 'refresh_token' to allow
automated daily email dispatching via the official Gmail API.
"""

import urllib.parse
import urllib.request
import json
import http.server
import socketserver
import webbrowser
import sys
import os

CLIENT_ID = "54322630044-vt5qaue05c8bprpbiv0hh3rij6odohpt.apps.googleusercontent.com"
CLIENT_SECRET = "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"
REDIRECT_URI = "http://localhost:8080"
SCOPE = "https://www.googleapis.com/auth/gmail.send"

auth_code = None

class OAuthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        if "code" in query:
            auth_code = query["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            html = """
            <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc;">
                <div style="background: #1e293b; max-width: 500px; margin: auto; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
                    <h2 style="color: #10b981;">✓ Authorization Successful!</h2>
                    <p style="color: #94a3b8;">You can now close this tab and return to your terminal.</p>
                </div>
            </body>
            </html>
            """
            self.wfile.write(html.encode("utf-8"))
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"No code received.")
    
    def log_message(self, format, *args):
        pass  # Suppress request logs


def main():
    print("=" * 60)
    print("⚡ QuoteCraft Pro — Gmail API OAuth2 Authorization")
    print("=" * 60)

    auth_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(auth_params)}"

    print("\n👉 Opening your browser to authorize Gmail sending permission...")
    print(f"\nIf your browser does not open automatically, visit this URL:\n{auth_url}\n")
    
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass

    print("⏳ Waiting for Google authorization on http://localhost:8080 ...")
    
    try:
        with socketserver.TCPServer(("", 8080), OAuthHandler) as httpd:
            while not auth_code:
                httpd.handle_request()
    except Exception as e:
        print(f"\n⚠️ Could not start local listener on port 8080: {e}")
        code_input = input("\nPlease paste the authorization code from Google: ").strip()
        globals()['auth_code'] = code_input

    if not auth_code:
        print("❌ Authorization failed: No code received.")
        sys.exit(1)

    print("\n🔄 Exchanging authorization code for Gmail Refresh Token...")

    token_url = "https://oauth2.googleapis.com/token"
    token_payload = urllib.parse.urlencode({
        "code": auth_code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }).encode("utf-8")

    req = urllib.request.Request(token_url, data=token_payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            refresh_token = data.get("refresh_token")
            access_token = data.get("access_token")

            if not refresh_token:
                print("\n⚠️ Warning: No refresh token returned. (You may have already authorized this app).")
                print("If needed, revoke permissions at https://myaccount.google.com/permissions and run this script again.")
            else:
                creds = {
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "refresh_token": refresh_token
                }
                creds_file = os.path.join(os.path.dirname(__file__), "gmail_credentials.json")
                with open(creds_file, "w") as f:
                    json.dump(creds, f, indent=2)
                
                print("\n" + "=" * 60)
                print("🎉 SUCCESS! Gmail API is now authenticated!")
                print("=" * 60)
                print(f"\n🔑 Your GMAIL_REFRESH_TOKEN:\n{refresh_token}\n")
                print(f"✓ Saved credentials to: {creds_file}")
                print("\n📋 For GitHub Actions:")
                print("Go to GitHub Repo -> Settings -> Secrets and variables -> Actions")
                print("Add a new secret:")
                print(f"Name:  GMAIL_REFRESH_TOKEN")
                print(f"Value: {refresh_token}")
                print("=" * 60)

    except Exception as e:
        print(f"❌ Error obtaining token: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
