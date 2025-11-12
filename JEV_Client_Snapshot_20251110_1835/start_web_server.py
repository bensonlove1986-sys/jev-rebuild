import http.server
import socketserver
import webbrowser
import threading
import time

PORT = 8080

handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"\n=== JEV Client Server ===")
    print(f"Server running at http://localhost:{PORT}")
    print(f"Login page: http://localhost:{PORT}/ui/login_portal.html")
    print(f"Press Ctrl+C to stop the server")
    print("========================\n")
    
    # Open login page in default browser after a short delay
    def open_browser():
        time.sleep(1)
        webbrowser.open(f'http://localhost:{PORT}/ui/login_portal.html')
    
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")