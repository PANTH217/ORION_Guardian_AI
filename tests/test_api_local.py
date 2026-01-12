
import requests
import io
from PIL import Image
import numpy as np

def test_process_frame():
    url = "http://127.0.0.1:5000/api/process_frame"
    
    # Create dummy image (black square)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    pil_image = Image.fromarray(img)
    
    # Save to bytes
    img_byte_arr = io.BytesIO()
    pil_image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    files = {'frame': ('test.jpg', img_byte_arr, 'image/jpeg')}
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request Failed: {e}")

if __name__ == "__main__":
    test_process_frame()
