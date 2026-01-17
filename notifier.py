import threading
import requests
import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import firebase_admin
from firebase_admin import credentials, messaging
import time
try:
    from twilio.rest import Client
except ImportError:
    print("WARNING: Twilio library not found. SMS will not work. Run 'pip install twilio'", flush=True)
    Client = None

class FCMNotifier:
    def __init__(self, logger=None):
        self.logger = logger
        # Settings file path
        self.settings_file = 'settings.json'
        
        # Default config
        self.fcm_token = ""
        
        self.email_enabled = False
        self.email_sender = ""
        self.email_password = ""
        self.email_recipient = ""
        
        self.sms_enabled = False
        self.sms_provider = 'telegram' 
        self.telegram_token = ''
        self.telegram_chat_id = ''

        self._load_settings()
        self._init_firebase()
        
        # Lock to prevent spamming alerts too quickly
        self._lock = threading.Lock()
        self._last_sent = 0
        self.cooldown = 3 # Reduced for testing

    def _init_firebase(self):
        try:
            # Check if service account key exists
            _dir = os.path.dirname(os.path.abspath(__file__))
            key_path = os.path.join(_dir, 'serviceAccountKey.json')
            if os.path.exists(key_path):
                # Manually load and fix private key format
                with open(key_path, 'r') as f:
                    service_account_info = json.load(f)
                
                # Fix escaped newlines if present
                if 'private_key' in service_account_info:
                    service_account_info['private_key'] = service_account_info['private_key'].replace('\\n', '\n')

                cred = credentials.Certificate(service_account_info)
                # Check if already initialized to avoid error on reload
                try:
                    firebase_admin.get_app()
                except ValueError:
                    firebase_admin.initialize_app(cred)
                print("DEBUG: Firebase Admin SDK initialized successfully.", flush=True)
            else:
                if self.logger: self.logger(f"Firebase Key '{key_path}' not found", "alert")
        except Exception as e:
            if self.logger: self.logger(f"Firebase Init Failed: {e}", "error")

    def _load_settings(self):
        try:
            data = {}
            # 1. Try Loading from Local File
            if os.path.exists(self.settings_file):
                try:
                    with open(self.settings_file, 'r') as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"WARNING: Error reading settings.json: {e}", flush=True)

            # 2. Try Loading from Environment Variable (Render "Secret File" or Env Var)
            # User mentioned putting settings.json content in an env var
            env_settings = os.environ.get('SETTINGS_JSON')
            if env_settings:
                try:
                    data = json.loads(env_settings)
                    print("DEBUG: Loaded settings from SETTINGS_JSON environment variable", flush=True)
                except Exception as e:
                    print(f"ERROR: Failed to parse SETTINGS_JSON env var: {e}", flush=True)

            # 3. Parse Data
            self.fcm_token = data.get('fcm_token', os.environ.get('FCM_TOKEN', ''))
            
            # Email
            email_conf = data.get('email_config', {})
            self.email_enabled = email_conf.get('enabled', os.environ.get('EMAIL_ENABLED', 'True').lower() == 'true')
            self.email_sender = email_conf.get('sender', os.environ.get('EMAIL_SENDER', ''))
            self.email_password = email_conf.get('password', os.environ.get('EMAIL_PASSWORD', ''))
            self.email_recipient = email_conf.get('recipient', os.environ.get('EMAIL_RECIPIENT', ''))
            self.email_server = email_conf.get('smtp_server', os.environ.get('SMTP_SERVER', 'smtp.gmail.com'))
            self.email_port = int(email_conf.get('smtp_port', os.environ.get('SMTP_PORT', 465)))
            
            # Telegram
            sms_conf = data.get('sms_config', {})
            self.sms_enabled = sms_conf.get('enabled', os.environ.get('SMS_ENABLED', 'True').lower() == 'true')
            self.sms_provider = sms_conf.get('provider', 'telegram')
            self.telegram_token = sms_conf.get('telegram_token', os.environ.get('TELEGRAM_TOKEN', ''))
            self.telegram_chat_id = sms_conf.get('telegram_chat_id', os.environ.get('TELEGRAM_CHAT_ID', ''))

            if self.logger: self.logger("Notification Settings Loaded", "info")
        except Exception as e:
            if self.logger: self.logger(f"Failed to load settings: {e}", "error")

    def update_settings(self, new_settings):
        """Updates internal settings and saves to file."""
        if 'fcm_token' in new_settings:
            self.fcm_token = new_settings['fcm_token']
        
        if 'email_config' in new_settings:
            conf = new_settings['email_config']
            self.email_enabled = conf.get('enabled', self.email_enabled)
            self.email_sender = conf.get('sender', self.email_sender)
            self.email_recipient = conf.get('recipient', self.email_recipient)
            # Only update password if provided and not empty
            if conf.get('password'):
                self.email_password = conf['password']
            
            # Update Server/Port if provided
            self.email_server = conf.get('smtp_server', self.email_server if hasattr(self, 'email_server') else 'smtp.gmail.com')
            self.email_port = int(conf.get('smtp_port', self.email_port if hasattr(self, 'email_port') else 465))

        if 'sms_config' in new_settings:
            conf = new_settings['sms_config']
            self.sms_enabled = conf.get('enabled', self.sms_enabled)
            self.sms_provider = 'telegram'
            self.telegram_token = conf.get('telegram_token', self.telegram_token)
            self.telegram_chat_id = conf.get('telegram_chat_id', self.telegram_chat_id)
            
        self._save_settings()

    def _save_settings(self):
        try:
            data = {
                'fcm_token': self.fcm_token,
                'email_config': {
                    'enabled': self.email_enabled,
                    'sender': self.email_sender,
                    'password': self.email_password,
                    'recipient': self.email_recipient,
                    'smtp_server': self.email_server if hasattr(self, 'email_server') else 'smtp.gmail.com',
                    'smtp_port': self.email_port if hasattr(self, 'email_port') else 465
                },
                'sms_config': {
                    'enabled': self.sms_enabled,
                    'provider': 'telegram',
                    'telegram_token': self.telegram_token,
                    'telegram_chat_id': self.telegram_chat_id
                }
            }
            with open(self.settings_file, 'w') as f:
                json.dump(data, f, indent=4)
            print("DEBUG: Settings saved to file.", flush=True)
        except Exception as e:
            print(f"ERROR: Failed to save settings: {e}", flush=True)

    def set_fcm_token(self, token):
        self.fcm_token = token
        self._save_settings()

    def send_fall_alert(self, image_bytes, location_data=None):
        """
        location_data: dict with 'lat', 'lng', 'map_link', 'timestamp'
        """
        with self._lock:
            current_time = time.time()
            if current_time - self._last_sent < self.cooldown:
                if self.logger: self.logger("Alert Cooldown Active - Skipping", "alert")
                return
            self._last_sent = current_time

        if self.logger: self.logger("FALL DETECTED! Processing Alerts...", "alert")
        
        # Log the event locally
        self._log_event(location_data)

        # 1. FCM (Always try if token exists)
        if self.fcm_token:
            threading.Thread(target=self._send_push_async, args=(location_data,)).start()
        
        # 2. Email
        if self.email_enabled and self.email_sender and self.email_recipient:
            threading.Thread(target=self._send_email_async, args=(image_bytes, location_data)).start()
            
        # 3. Telegram
        if self.sms_enabled and self.telegram_token and self.telegram_chat_id:
            threading.Thread(target=self._send_telegram_async, args=(image_bytes, location_data)).start()

    def _log_event(self, location_data):
        try:
            # Use absolute path to ensure file is written to correct location
            _dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(_dir, 'events.json')
            
            event = {
                'id': int(time.time() * 1000), 
                'timestamp': location_data.get('timestamp', 'Unknown'),
                'type': 'Fall Detected',
                'status': 'CONFIRMED',
                'confidence': 'HIGH',
                'location': 'Living Room'
            }
            
            events = []
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        events = json.load(f)
                except:
                    events = []
            
            events.insert(0, event)
            events = events[:50]
            
            with open(file_path, 'w') as f:
                json.dump(events, f, indent=4)
            print(f"DEBUG: Event logged to {file_path}", flush=True)
        except Exception as e:
            print(f"ERROR: Failed to log event: {e}", flush=True)

    def _send_push_async(self, location_data):
        try:
            title = "URGENT: Fall Detected!"
            body = "A fall has been detected! Please check immediately."
            if location_data:
                body += f" Location: {location_data.get('map_link', 'Unknown')}"
            
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={
                    'risk_level': 'HIGH',
                    'timestamp': location_data.get('timestamp', '') if location_data else '',
                    'location_link': location_data.get('map_link', '') if location_data else ''
                },
                token=self.fcm_token,
            )
            response = messaging.send(message)
            if self.logger: self.logger(f"FCM Push Sent: {response}", "success")
        except Exception as e:
            if self.logger: self.logger(f"FCM Failed: {e}", "error")

    def _send_email_async(self, image_bytes, location_data):
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_sender
            msg['To'] = self.email_recipient
            msg['Subject'] = "URGENT: Fall Detected - RehabVision AI"
            
            body = "⚠️ A fall event has been detected by the AI monitoring system.\n\n"
            if location_data:
                body += f"Time: {location_data.get('timestamp', 'Now')}\n"
                body += f"Location: {location_data.get('map_link', 'N/A')}\n"
            body += "\nPlease check the attached snapshot and verified the situation."
            
            msg.attach(MIMEText(body, 'plain'))
            
            if image_bytes:
                img = MIMEImage(image_bytes, name="fall_snapshot.jpg")
                msg.attach(img)
            
            # Get SMTP settings with defaults for Gmail
            smtp_server = self.email_server if hasattr(self, 'email_server') and self.email_server else 'smtp.gmail.com'
            smtp_port = self.email_port if hasattr(self, 'email_port') and self.email_port else 465
            
            # Connect to valid server
            if smtp_port == 587:
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port)
                
            server.login(self.email_sender, self.email_password)
            server.send_message(msg)
            server.quit()
            if self.logger: self.logger("Email Alert Sent Successfully", "success")
        except Exception as e:
            if self.logger: self.logger(f"Email Failed: {e}", "error")

    def _send_telegram_async(self, image_bytes, location_data):
        """Sends Telegram message with photo"""
        try:
            caption = "⚠️ *FALL DETECTED!* ⚠️\n\n"
            caption += f"⏰ Time: {location_data.get('timestamp', 'Now')}\n"
            if location_data and location_data.get('map_link'):
                caption += f"📍 Location: [Map]({location_data.get('map_link')})\n"
            caption += "\n_Please check immediately._"

            url = f"https://api.telegram.org/bot{self.telegram_token}/sendPhoto"
            
            # Prepare data
            files = {}
            if image_bytes:
                files['photo'] = ('capture.jpg', image_bytes, 'image/jpeg')
            
            data = {
                'chat_id': self.telegram_chat_id,
                'caption': caption,
                'parse_mode': 'Markdown'
            }

            # If no image, fallback to sendMessage
            if not image_bytes:
                url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
                data = {
                    'chat_id': self.telegram_chat_id,
                    'text': caption,
                    'parse_mode': 'Markdown'
                }
                response = requests.post(url, data=data, timeout=10)
            else:
                response = requests.post(url, data=data, files=files, timeout=15)
            
            if response.status_code == 200:
                if self.logger: self.logger("Telegram Alert Sent Successfully", "success")
            else:
                if self.logger: self.logger(f"Telegram Failed ({response.status_code}): {response.text}", "error")

        except Exception as e:
            if self.logger: self.logger(f"Telegram Failed: {e}", "error")
