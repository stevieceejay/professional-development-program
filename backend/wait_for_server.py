import socket
import time

def wait_for_server(host='localhost', port=5000, timeout=30):
    """Wait for server to be available"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()
            if result == 0:
                print(f"✓ Server is running on {host}:{port}")
                return True
            time.sleep(1)
        except:
            time.sleep(1)
    print(f"✗ Server not available on {host}:{port} after {timeout}s")
    return False

print("Checking if server is running...")
if not wait_for_server():
    print("\nPlease start the server:")
    print("  cd C:\\Users\\NewAdmin\\Documents\\ARG-professional-developement")
    print("  npm start")
    exit(1)