
import os
import hashlib
import sys

try:
    import tensorflow.lite as tflite
except ImportError:
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        print("Error: Neither tensorflow.lite nor tflite_runtime found.")
        sys.exit(1)

MODEL_PATH = 'ai_models/posenet_mobilenet_v1_100_257x257_multi_kpt_stripped.tflite'

def get_md5(fname):
    hash_md5 = hashlib.md5()
    with open(fname, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def verify_model():
    if not os.path.exists(MODEL_PATH):
        print(f"❌ File not found: {MODEL_PATH}")
        return

    size = os.path.getsize(MODEL_PATH)
    print(f"📂 File Size: {size} bytes")
    
    md5 = get_md5(MODEL_PATH)
    print(f"🔑 MD5 Hash: {md5}")

    print("🧠 Attempting to load model with TFLite Interpreter...")
    try:
        interpreter = tflite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        print("✅ SUCCESS: Model loaded and tensors allocated!")
    except Exception as e:
        print(f"❌ FAILURE: Failed to load model. Error: {e}")

if __name__ == "__main__":
    verify_model()
