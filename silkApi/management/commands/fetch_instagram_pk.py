import os
import time
from django.core.management.base import BaseCommand
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, UserNotFound, ClientError
from silkApi.models import Student

class Command(BaseCommand):
    help = 'Fetch and update Instagram PKs for students'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cl = Client()

    def handle(self, *args, **options):
        if not self.setup_instagram_client():
            self.stdout.write(self.style.ERROR("Failed to setup Instagram client"))
            return

        students = Student.objects.filter(
            Instagram_id__isnull=False,
            instagram_pk__isnull=True
        ).exclude(Instagram_id="")

        self.stdout.write(f"Found {students.count()} students to process")

        updated_count = 0
        failed_count = 0

        for student in students:
            self.stdout.write(f"Processing: {student.name} - {student.Instagram_id}")
            pk = self.get_instagram_pk(student.Instagram_id)
            if pk:
                student.instagram_pk = pk
                student.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f"✅ Updated {student.name} with PK: {pk}"))
            else:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f"❌ Failed to get PK for {student.name}"))
            time.sleep(2)

        self.stdout.write(f"\n📊 Summary:")
        self.stdout.write(self.style.SUCCESS(f"✅ Successfully updated: {updated_count}"))
        self.stdout.write(self.style.ERROR(f"❌ Failed: {failed_count}"))

    def setup_instagram_client(self):
        SESSION_FILE = "session.json"
        
        if os.path.exists(SESSION_FILE):
            self.cl.load_settings(SESSION_FILE)
            self.stdout.write("✅ Loaded session from file.")
        else:
            username = "chatha_poocha_and_6389_others"
            password = "Mishal123.."
            try:
                self.cl.login(username, password)
                self.cl.dump_settings(SESSION_FILE)
                self.stdout.write("✅ Logged in and session saved.")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Login failed: {e}"))
                return False
        return True

    def get_instagram_pk(self, username):
        if not username or username.strip() == "":
            return None
        try:
            clean_username = username.replace(" (Not verified)", "").replace(" ", "").strip()
            self.stdout.write(f"Fetching PK for: {clean_username}")
            user_info = self.cl.user_info_by_username(clean_username)
            return str(user_info.pk)
        except UserNotFound:
            self.stdout.write(self.style.WARNING(f"❌ User not found: {clean_username}"))
            return None
        except ClientError as e:
            self.stdout.write(self.style.ERROR(f"❌ Client error for {clean_username}: {e}"))
            return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Unexpected error for {clean_username}: {e}"))
            return None