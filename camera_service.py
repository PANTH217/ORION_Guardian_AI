import cv2
import time
import numpy as np
from PIL import Image
from src.pipeline.fall_detect import FallDetector
from notifier import FCMNotifier
import io
import os # Added for _init_detector
import threading # For Async AI Loading


_model_lock = threading.Lock()

class CameraService:
    def __init__(self, logger=None):
        self.camera = None
        self.logger = logger
        self.notifier = FCMNotifier(logger=logger)
        self.current_location = None
        self.fall_detector = None # Initialize to None for Async Loader
        if self.logger: self.logger("Camera Service Initialized (NO AI MODE)", "info")

    def update_fcm_token(self, token):
        self.notifier.set_fcm_token(token)

    def update_location(self, lat, lng):
        self.current_location = {
            'lat': lat,
            'lng': lng,
            'map_link': f"https://www.google.com/maps?q={lat},{lng}"
        }
        if self.logger: self.logger(f"GPS Location Updated: {lat}, {lng}", "info")

    def _init_detector(self):
        if self.fall_detector is not None:
            return self.fall_detector

        with _model_lock:
            if self.fall_detector is not None:
                return self.fall_detector

            _dir = os.path.dirname(os.path.abspath(__file__))
            _good_tflite_model = os.path.join(
                _dir,
                'ai_models/posenet_mobilenet_v1_100_257x257_multi_kpt_stripped.tflite'
            )
            _good_edgetpu_model = os.path.join(
                _dir,
                'ai_models/posenet_mobilenet_v1_075_721_1281_quant_decoder_edgetpu.tflite'
            )
            _good_labels = os.path.join(_dir, 'ai_models/pose_labels.txt')
            
            config = {
                'model': {
                    'tflite': _good_tflite_model,
                    'edgetpu': _good_edgetpu_model,
                },
                'labels': _good_labels,
                'top_k': 5,
                'confidence_threshold': 0.45,
                'model_name': 'mobilenet'
            }

            try:
                self.fall_detector = FallDetector(**config)
                if self.logger:
                    self.logger(
                        "AI Model Loaded: PoseNet MobileNet v1 (Sensitivity: Balanced)",
                        "success"
                    )
            except Exception as e:
                self.ai_disabled = True
                self.ai_error_msg = str(e)
                if self.logger:
                    self.logger(f"AI Model Load FAILED: {e}", "error")
                raise e # Re-raise to be caught by process_frame
            
            return self.fall_detector

    def start_camera(self):
        # Migrated to Frontend. Backend no longer accesses hardware directly.
        pass

    def stop_camera(self):
        # Migrated to Frontend.
        pass

    def reset_alert(self):
        """Manually clears the fall detection latch."""
        self.alert_latch_until = 0
        if self.logger: self.logger("Alert Manually Reset by User", "info")

    def _draw_keypoints(self, frame, keypoints):
        # Helper to draw skeleton
        connections = [
            ('left shoulder', 'right shoulder'),
            ('left shoulder', 'left hip'),
            ('right shoulder', 'right hip'),
            ('left hip', 'right hip')
        ]
        
        points = {}
        for name, coord in keypoints.items():
            if coord is not None:
                x = int(coord[0]) # Fixed: Index 0 is X
                y = int(coord[1]) # Fixed: Index 1 is Y
                points[name] = (x, y)
                cv2.circle(frame, (x, y), 5, (255, 0, 0), -1) 
        
        for start, end in connections:
            if start in points and end in points:
                cv2.line(frame, points[start], points[end], (255, 0, 0), 2)

    def _draw_bounding_box(self, frame, keypoints, color):
        """Draws a bounding box around the detected person."""
        x_coords = []
        y_coords = []
        
        for coord in keypoints.values():
            if coord is not None:
                x_coords.append(coord[0]) # Fixed: Index 0 is X
                y_coords.append(coord[1]) # Fixed: Index 1 is Y
        
        if x_coords and y_coords:
            min_x, max_x = int(min(x_coords)), int(max(x_coords))
            min_y, max_y = int(min(y_coords)), int(max(y_coords))
            
            pad = 20
            h, w, _ = frame.shape
            min_x = max(0, min_x - pad)
            min_y = max(0, min_y - pad)
            max_x = min(w, max_x + pad)
            max_y = min(h, max_y + pad)
            
            cv2.rectangle(frame, (min_x, min_y), (max_x, max_y), color, 3)
            
            label_bg_pt2 = (min_x + 140, min_y - 25)
            cv2.rectangle(frame, (min_x, min_y - 30), label_bg_pt2, color, -1)

    def generate_frames(self):
        # Initial connect attempt
        self.start_camera()
        
        while True:
            # Infinite Retry Loop for Connection
            if self.camera is None or not self.camera.isOpened():
                print("Camera link down. Retrying...", flush=True)
                self.start_camera()
                
                # If still down, show "Connecting" frame
                if self.camera is None or not self.camera.isOpened():
                    error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(error_frame, "CONNECTING TO CAMERA...", (50, 240), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)
                    cv2.putText(error_frame, "PLEASE WAIT", (200, 300), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
                    
                    ret, buffer = cv2.imencode('.jpg', error_frame)
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                    
                    time.sleep(1.0)
                    continue

            # Read Real Frame
            success, frame = self.camera.read()
            if not success:
                print("Read Error. Reconnecting...", flush=True)
                self.camera.release()
                self.camera = None
                continue

            # Simple Overlay (No AI) -> REPLACED WITH AI LOGIC
            # cv2.putText(frame, "LIVE FEED - NO AI", (10, 30), 
            #             cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # --- GLOBAL TRY/CATCH TO PREVENT 500 ERRORS ---
            try:
                # --- AI LOGIC START ---
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)
                
                # Singleton AI Loading
                if self.fall_detector is None:
                    self._init_detector()

                # AI IS READY
                if self.fall_detector:
                     # DEBUG VISUAL
                    cv2.putText(frame, f"AI SYSTEM ONLINE", (10, 60), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

                processed_sample = None
                if self.fall_detector:
                    try:
                        processed_sample = next(self.fall_detector.process_sample(image=pil_image))
                    except Exception as e:
                        # If inference fails, just show raw video
                        print(f"Inference Error: {e}", flush=True)
                        pass
                
                status_text = "Status: No Detection"
                if self.fall_detector:
                     status_text = "Status: Monitoring"
                
                color_status = (0, 255, 255) # Yellow

                # Check for alert latch expiration
                current_time = time.time()
                is_latched = hasattr(self, 'alert_latch_until') and current_time < self.alert_latch_until

                if processed_sample:
                    inference_result = processed_sample.get('inference_result')
                    color_status = (0, 255, 0) # Green

                    if inference_result:
                        for det in inference_result:
                            keypoints = det.get('keypoint_corr')
                            label = det.get('label')
                            
                            box_color = (0, 255, 0)
                            box_label = "NORMAL"
                            
                            if label == 'FALL' or is_latched:
                                box_color = (0, 0, 255) # Red
                                box_label = "FALL DETECTED"
                                
                            if keypoints:
                                self._draw_keypoints(frame, keypoints)
                                self._draw_bounding_box(frame, keypoints, box_color)
                                
                                x_coords = [c[0] for c in keypoints.values() if c is not None]
                                y_coords = [c[1] for c in keypoints.values() if c is not None]
                                if x_coords and y_coords:
                                    txt_x = max(0, int(min(x_coords)) - 20)
                                    txt_y = max(30, int(min(y_coords)) - 35)
                                    display_label = "ID:1 FALLEN" if box_label == "FALL DETECTED" else "ID:1 ACTIVE"
                                    cv2.putText(frame, display_label, (txt_x + 5, txt_y + 20), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

                            if label == 'FALL':
                                self.alert_latch_until = current_time + 5.0
                                is_latched = True
                                _, img_encoded = cv2.imencode('.jpg', frame)
                                import datetime
                                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                payload = {'timestamp': now_str}
                                if self.current_location:
                                    payload.update(self.current_location)
                                try:
                                    self.notifier.send_fall_alert(img_encoded.tobytes(), payload)
                                except Exception as e:
                                    print(f"Notification Failed: {e}", flush=True)

                if is_latched:
                    status_text = "WARNING: FALL DETECTED!"
                    color_status = (0, 0, 255)
                    cv2.putText(frame, f"FALL TRIGGERED", (10, 90), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                            1, color_status, 2, cv2.LINE_AA)
                # --- AI LOGIC END ---
            except Exception as e:
                print(f"CRITICAL LOOP ERROR: {e}", flush=True)
                # import traceback
                # traceback.print_exc()
                # On error, we just continue so we at least stream the raw frame
                pass

            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    def process_frame(self, image_bytes):
        """
        Processes a single frame uploaded from the frontend.
        Returns detection results (status, keypoints) in JSON-compatible format.
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {"error": "Failed to decode image"}

            # Prepare for AI
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_frame)

            # Lazy-load AI if needed (Synchronous here to return result immediately)
            # Lazy-load AI if needed (Singleton Guard)
            if getattr(self, 'ai_disabled', False):
                return {"status": "AI_ERROR", "error": getattr(self, 'ai_error_msg', "Unknown AI Error")}

            if self.fall_detector is None:
                try:
                    self._init_detector()
                except Exception as e:
                     return {"error": f"AI Init Failed: {str(e)}"}

            # Run Inference
            if self.fall_detector:
                processed_sample = next(self.fall_detector.process_sample(image=pil_image))
                inference_result = processed_sample.get('inference_result')
                
                # Default Clean Result
                result = {
                    "status": "NORMAL",
                    "detections": [],
                    "alert_active": False
                }

                # Check Latch
                current_time = time.time()
                is_latched = hasattr(self, 'alert_latch_until') and current_time < self.alert_latch_until

                if inference_result:
                    for det in inference_result:
                        label = det.get('label')
                        keypoints = det.get('keypoint_corr') # { 'nose': [x,y], ... }
                        
                        # Serialize Keypoints (numpy floats to native python floats)
                        serialized_kpts = {}
                        if keypoints:
                            for k, v in keypoints.items():
                                if v is not None:
                                    serialized_kpts[k] = [float(v[0]), float(v[1])]

                        detection_data = {
                            "label": label,
                            "keypoints": serialized_kpts,
                            "score": float(det.get('score', 0))
                        }
                        result["detections"].append(detection_data)

                        if label == 'FALL':
                            self.alert_latch_until = current_time + 5.0
                            is_latched = True
                            
                            # Trigger Notification (Background)
                            # We re-encode the frame for the alert image
                            _, img_encoded = cv2.imencode('.jpg', frame)
                            import datetime
                            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            payload = {'timestamp': now_str}
                            if self.current_location:
                                payload.update(self.current_location)
                            
                            # Run notification in separate thread to not block response
                            threading.Thread(target=self.notifier.send_fall_alert, 
                                           args=(img_encoded.tobytes(), payload)).start()

                if is_latched:
                    result["status"] = "FALL_DETECTED"
                    result["alert_active"] = True
                
                return result
            
            return {"status": "AI_NOT_READY"}

        except Exception as e:
            print(f"Frame Processing Error: {e}", flush=True)
            return {"error": str(e)}
