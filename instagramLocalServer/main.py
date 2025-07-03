import os
import requests
from fastapi import FastAPI, HTTPException, Query
from instagrapi import Client
from dotenv import load_dotenv
import base64
import uvicorn

load_dotenv()
app = FastAPI()

SESSION_FILE = "session.json"
cl = Client()

def setup_instagram_client():
    if os.path.exists(SESSION_FILE):
        cl.load_settings(SESSION_FILE)
    else:
        username = os.environ.get('INSTAGRAM_USERNAME')
        password = os.environ.get('INSTAGRAM_PASSWORD')
        
        if not username or not password:
            raise HTTPException(status_code=500, detail="Instagram credentials not found")
        
        cl.login(username, password)
        cl.dump_settings(SESSION_FILE)
    return True

@app.get("/api/fetch")
async def fetch_instagram_info(
    pk: str = Query(..., description="Instagram user pk")
):
    """Fetch Instagram user information by pk with profile picture"""
    try:
        setup_instagram_client()
        user_info = cl.user_info(pk)
        
        response_data = {
            'pk': user_info.pk,
            'username': user_info.username,
            'full_name': user_info.full_name,
            'is_private': user_info.is_private,
            'follower_count': user_info.follower_count,
            'media_count': user_info.media_count,
        }
        
        # Always fetch profile picture
        try:
            original_url = str(user_info.profile_pic_url)
            pic_response = requests.get(original_url, timeout=10)
            
            if pic_response.status_code == 200:
                # Convert image to base64
                image_base64 = base64.b64encode(pic_response.content).decode('utf-8')
                content_type = pic_response.headers.get('content-type', 'image/jpeg')
                
                response_data['profile_pic'] = {
                    'data': f"data:{content_type};base64,{image_base64}",
                    'content_type': content_type,
                    'size': len(pic_response.content)
                }
            else:
                response_data['profile_pic'] = None
                response_data['profile_pic_error'] = "Could not fetch profile picture"
        except Exception as pic_error:
            response_data['profile_pic'] = None
            response_data['profile_pic_error'] = str(pic_error)
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Instagram info: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Instagram API with FastAPI"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7070)