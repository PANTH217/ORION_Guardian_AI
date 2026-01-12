import os
# Fix for Protobuf 3.x vs 4.x compatibility with TensorFlow
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

from flask import Flask, render_template, Response, jsonify, request, send_from_directory
from flask_cors import CORS
import threading
import json

app = Flask(__name__)
CORS(app) # Allow frontend to call API


# In-memory system logs
system_logs = []

def add_system_log(message, level='info'):
    """Adds a log entry to the in-memory buffer."""
    import datetime
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = {
        'time': timestamp,
        'message': message,
        'type': level # 'info', 'alert', 'error', 'success'
    }
    system_logs.append(log_entry)
    # Keep only last 100 logs
    if len(system_logs) > 100:
        system_logs.pop(0)
    print(f"[{level.upper()}] {message}", flush=True)

# Pass logger to services
camera_service = None
try:
    from camera_service import CameraService 
    camera_service = CameraService(logger=add_system_log)
except Exception as e:
    add_system_log(f"CRITICAL STARTUP ERROR: {str(e)}", "error")    
    import traceback
    traceback.print_exc()
    # Create a dummy service to prevent attribute errors in routes
    class DummyService:
        def __init__(self): self.notifier = None
        def generate_frames(self): yield b''
        def update_fcm_token(self, t): pass
        def update_location(self, l, lg): pass
        def reset_alert(self): pass
        def process_frame(self, i): return {"error": "Backend Startup Failed"}
        
        # Mock notifier for settings route
        class MockNotifier:
             email_enabled = False
             email_sender = ""
             email_recipient = ""
             email_password = ""
             sms_enabled = False
             telegram_token = ""
             telegram_chat_id = ""
        notifier = MockNotifier()
        
    camera_service = DummyService()

@app.route('/video_feed')
def video_feed():
    return Response(camera_service.generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "running"}), 200

@app.route('/api/system_logs', methods=['GET'])
def get_system_logs():
    return jsonify(system_logs), 200

@app.route('/api/register_client', methods=['POST'])
def register_client():
    data = request.json
    token = data.get('token')
    if token:
        camera_service.update_fcm_token(token)
        add_system_log("New Client Registered (FCM)", "success")
        return jsonify({"status": "Token registered"}), 200
    return jsonify({"error": "No token provided"}), 400

@app.route('/api/location', methods=['POST'])
def update_location():
    data = request.json
    lat = data.get('latitude')
    lng = data.get('longitude')
    if lat is not None and lng is not None:
        camera_service.update_location(lat, lng)
        return jsonify({"status": "Location updated"}), 200
    return jsonify({"error": "Invalid location"}), 400

@app.route('/api/reset_alert', methods=['POST'])
def reset_alert():
    try:
        camera_service.reset_alert()
        return jsonify({"status": "Alert reset"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_settings', methods=['GET'])
def get_settings():
    # Only return safe data, mask passwords
    n = camera_service.notifier
    return jsonify({
        'email_config': {
            'enabled': n.email_enabled,
            'sender': n.email_sender,
            'recipient': n.email_recipient,
            'password_set': bool(n.email_password) # Flag to indicate if set
        },
        'sms_config': {
            'enabled': n.sms_enabled,
            'provider': 'telegram',
            'telegram_token': n.telegram_token,
            'telegram_chat_id': n.telegram_chat_id
        }
    }), 200

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    try:
        data = request.json
        camera_service.notifier.update_settings(data)
        add_system_log("Settings updated by user", "info")
        return jsonify({"status": "Settings saved"}), 200
    except Exception as e:
        add_system_log(f"Settings save failed: {str(e)}", "error")
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET', 'DELETE'])
def get_history():
    try:
        _dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(_dir, 'events.json')
        
        if request.method == 'DELETE':
            with open(file_path, 'w') as f:
                json.dump([], f)
            add_system_log("Fall History cleared", "info")
            return jsonify({"status": "History cleared"}), 200
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
            return jsonify(data), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/process_frame', methods=['POST'])
def process_frame():
    try:
        # Check if frame is in files
        if 'frame' not in request.files:
             # Fallback for base64/raw? No, stick to multipart for efficiency
            return jsonify({"error": "No frame file provided"}), 400
        
        file = request.files['frame']
        # Read bytes
        image_bytes = file.read()
        
        # Process
        result = camera_service.process_frame(image_bytes)
        return jsonify(result), 200
    except Exception as e:
        add_system_log(f"API Processing Error: {e}", "error")
        return jsonify({"error": str(e)}), 500



# Initial Startup Log
add_system_log("System Startup Sequence Initiated", "info")

if __name__ == '__main__':
    # Threaded=True is important for streaming to work while serving other requests
    add_system_log("Initializing Camera Service (Async)...", "info")
    # Run camera init in background so it doesn't block server startup
    threading.Thread(target=camera_service.start_camera, daemon=True).start()
    
    add_system_log("Web Server Starting on Port 5000 (Single Process Mode)", "success")
    
    # Render assigns port via environment variable
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, threaded=True, debug=False, use_reloader=False)
