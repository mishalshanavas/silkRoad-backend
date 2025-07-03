import os
import sys
import django
import time
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, UserNotFound, ClientError
from silkApi.models import Student

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'silkRoad.settings')
django.setup()

SESSION_FILE = os.path.join(project_root, "session.json")
cl = Client()

def setup_instagram_client():
    if os.path.exists(SESSION_FILE):
        cl.load_settings(SESSION_FILE)
        print("✅ Loaded session from file.")
    else:
        username = "chatha_poocha_and_6389_others"
        password = "Mishal123.."
        try:
            cl.login(username, password)
            cl.dump_settings(SESSION_FILE)
            print("✅ Logged in and session saved.")
        except Exception as e:
            print(f"❌ Login failed: {e}")
            return False
    return True

def get_instagram_pk(username):
    if not username or username.strip() == "":
        return None
    try:
        clean_username = username.replace(" (Not verified)", "").replace(" ", "").strip()
        print(f"Fetching PK for: {clean_username}")
        user_info = cl.user_info_by_username(clean_username)
        return str(user_info.pk)
    except UserNotFound:
        print(f"❌ User not found: {clean_username}")
        return None
    except ClientError as e:
        print(f"❌ Client error for {clean_username}: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error for {clean_username}: {e}")
        return None

def fetch_and_update_instagram_pks():
    if not setup_instagram_client():
        print("Failed to setup Instagram client")
        return

    students = Student.objects.filter(
        Instagram_id__isnull=False,
        instagram_pk__isnull=True
    ).exclude(Instagram_id="")

    print(f"Found {students.count()} students to process")

    updated_count = 0
    failed_count = 0

    for student in students:
        print(f"Processing: {student.name} - {student.Instagram_id}")
        pk = get_instagram_pk(student.Instagram_id)
        if pk:
            student.instagram_pk = pk
            student.save()
            updated_count += 1
            print(f"✅ Updated {student.name} with PK: {pk}")
        else:
            failed_count += 1
            print(f"❌ Failed to get PK for {student.name}")
        time.sleep(2)

    print(f"\n📊 Summary:")
    print(f"✅ Successfully updated: {updated_count}")
    print(f"❌ Failed: {failed_count}")

if __name__ == "__main__":
    fetch_and_update_instagram_pks()
