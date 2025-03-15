from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from PIL import Image
from io import BytesIO
import os
from django.core.files.base import ContentFile
from pathlib import Path
from django.db.models.signals import post_save
from django.dispatch import receiver




def get_upload_path(instance, filename):
    """Generate a unique path for uploaded files"""
    ext = Path(filename).suffix
    random_filename = get_random_string(length=12)
    return f'maintenance_job_images/{timezone.now().strftime("%Y/%m")}/{random_filename}{ext}'


class ImageProcessor:
    @staticmethod
    def process_image(image, max_width=200, max_height=100, quality=85):
        """Process and optimize images"""
        try:
            img = Image.open(image)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            aspect = img.width / img.height
            new_width = min(max_width, img.width)
            new_height = min(max_height, int(new_width / aspect))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            output = BytesIO()
            img.save(output, format='WEBP', quality=quality, optimize=True)
            output.seek(0)
            return output
        except Exception as e:
            print(f"Image processing failed: {e}")
            return None


class Property(models.Model):
    property_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        editable=False
    )
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    users = models.ManyToManyField(User, related_name='accessible_properties')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Properties'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.property_id:
            self.property_id = f"P{get_random_string(length=8, allowed_chars='0123456789ABCDEF')}"
        super().save(*args, **kwargs)


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    room_type = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    properties = models.ManyToManyField(
        Property,
        related_name='rooms',
        blank=True
    )

    class Meta:
        ordering = ['room_type', 'name']
        verbose_name_plural = 'Rooms'
        indexes = [
            models.Index(fields=['room_type']),
            models.Index(fields=['is_active'])
        ]

    def __str__(self):
        return f"{self.room_type} - {self.name}"

    def clean(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValidationError("Room name cannot be empty.")

    def activate(self):
        self.is_active = True
        self.save()

    def deactivate(self):
        self.is_active = False
        self.save()


class Topic(models.Model):
    title = models.CharField(
        max_length=160,
        unique=True,
        verbose_name="Subject"
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['title']
        verbose_name_plural = 'Topics'

    def __str__(self):
        return self.title

class JobImage(models.Model):
    # Image size configuration
    MAX_SIZE = (800, 800)  # Maximum image dimensions

    job = models.ForeignKey(
        'Job',  # Add ForeignKey to Job
        on_delete=models.CASCADE,
        related_name='job_images',  # Related name for reverse access
        help_text="The job associated with this image"
    )

    image = models.ImageField(
        upload_to='maintenance_job_images/%Y/%m/',
        validators=[FileExtensionValidator(['png', 'jpg', 'jpeg', 'gif', 'webp'])],
        null=True,
        blank=True,
        help_text="Uploaded image file"
    )

    uploaded_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_job_images',
        help_text="User who uploaded the image"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the image was uploaded"
    )

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Job Image'
        verbose_name_plural = 'Job Images'

    def __str__(self):
        return f"Image for Job {self.job.job_id} uploaded at {self.uploaded_at.date()}"

    def process_image(self, image_file, quality=85):
        """
        Process and resize the image, converting it to WebP format.
        """
        try:
            img = Image.open(image_file)

            # Resize if image is larger than MAX_SIZE
            if img.width > self.MAX_SIZE[0] or img.height > self.MAX_SIZE[1]:
                img.thumbnail(self.MAX_SIZE, Image.Resampling.LANCZOS)

            # Convert RGBA to RGB if necessary
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.getchannel('A'))
                img = background

            # Convert to RGB if not already
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Create BytesIO object for the processed image
            output = BytesIO()

            # Save as WebP
            img.save(output, 'JPEG', quality=quality, optimize=True)
            output.seek(0)

            return output
        except Exception as e:
            raise Exception(f"Error processing image: {e}")

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Process and convert image only if it's a new image
        if is_new and self.image:
            try:
                # Process and convert image
                processed_image = self.process_image(self.image)

                # Generate filename for WebP version
                webp_name = f'{os.path.splitext(self.image.name)[0]}.webp'

                # Save the WebP version of the image
                self.image.save(
                    webp_name,
                    ContentFile(processed_image.getvalue()),  # Save the processed image
                    save=False  # Don’t save the model yet, we still need to handle other fields
                )

                # Close the processed image to free memory
                processed_image.close()

            except Exception as e:
                print(f"Error processing image: {e}")

        # Call the parent save method to store the object in the database
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Remove image file when model instance is deleted"""
        if self.image:
            if os.path.isfile(self.image.path):
                os.remove(self.image.path)

        super().delete(*args, **kwargs)

class Job(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('waiting_sparepart', 'Waiting Sparepart'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
     
    ]
   
    job_id = models.CharField(
        max_length=16, 
        unique=True, 
        blank=True, 
        editable=False
    )
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='updated_jobs')
   
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='maintenance_jobs'
    )
    rooms = models.ManyToManyField(
        Room, 
        related_name='jobs', 
        blank=True
    )
    topics = models.ManyToManyField(
        Topic, 
        related_name='jobs', 
        blank=True
    )
    is_defective = models.BooleanField(default=False)
    images = models.ManyToManyField(
        'JobImage', 
        related_name='jobs', 
        blank=True
    )
    description = models.TextField()
    remarks = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        db_index=True
    )
    priority = models.CharField(
        max_length=20, 
        choices=PRIORITY_CHOICES, 
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Maintenance Jobs'
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Job {self.job_id} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if not self.job_id:
            self.job_id = self.generate_job_id()
        
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    @classmethod
    def generate_job_id(cls):
        timestamp = timezone.now().strftime('%y')
        unique_id = get_random_string(length=6, allowed_chars='0123456789ABCDEF')
        return f"j{timestamp}{unique_id}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    positions = models.TextField(blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    properties = models.ManyToManyField(
        Property,
        related_name='user_profiles',
        blank=True
    )

    def __str__(self):
        return f"{self.user.username}'s Profile"
  # New fields for Google Auth
      # Google OAuth fields
    google_id = models.CharField(max_length=100, blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    login_provider = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['google_id']),
        ]

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def save(self, *args, **kwargs):
        if self.profile_image:
            try:
                img = Image.open(self.profile_image)
                
                # Convert RGBA to RGB if necessary
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.getchannel('A'))
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Resize image if too large
                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size, Image.Resampling.LANCZOS)

                # Save as WebP
                output = BytesIO()
                img.save(output, format='WEBP', quality=85, optimize=True)
                output.seek(0)

                # Generate unique filename
                random_name = get_random_string(12)
                webp_name = f'profile_images/{random_name}.webp'

                # Save the processed image
                self.profile_image.save(
                    webp_name,
                    ContentFile(output.getvalue()),
                    save=False
                )
                
                output.close()
            except Exception as e:
                print(f"Error processing profile image: {e}")

        super().save(*args, **kwargs)

    def update_from_google_data(self, google_data):
        """Update profile with data from Google"""
        if google_data.get('picture'):
            self.profile_image = google_data['picture']
        
        self.google_id = google_data.get('sub')
        self.email_verified = google_data.get('email_verified', False)
        self.login_provider = 'google'
        
        # Update user model fields
        self.user.first_name = google_data.get('given_name', '')
        self.user.last_name = google_data.get('family_name', '')
        self.user.email = google_data.get('email', '')
        
        self.user.save()
        self.save()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a UserProfile for every new User"""
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if not hasattr(instance, 'userprofile'):
        UserProfile.objects.create(user=instance)
    instance.userprofile.save()
import requests
import os
from django.conf import settings
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)

def update_from_google_data(self, idinfo):
    profile_image_url = idinfo.get('picture')
    if profile_image_url:
        logger.info(f"Processing profile image URL: {profile_image_url}")  # Log URL
        try:
            response = requests.get(profile_image_url, stream=True, timeout=10)  # Download image with timeout
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

            filename = f"profile_image_{self.user.id}.jpg"  # Generate unique filename
            profile_image_path = os.path.join(settings.MEDIA_ROOT, filename)  # Correct path

            logger.info(f"Generated profile image path: {profile_image_path}")  # Log path before saving
            self.profile_image.save(filename, ContentFile(response.content), save=False) # Save using ContentFile
            logger.info(f"Profile image saved successfully to: {self.profile_image.path}")  # Log save success

        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading profile image from {profile_image_url}: {e}") # Log download error
            logger.exception(e) # Log exception traceback
        except Exception as e:
            logger.error(f"Error saving profile image to {profile_image_path}: {e}") # Log save error
            logger.exception(e) # Log exception traceback
    else:
        logger.info("No profile image URL found in Google data.") # Log if no image URL

    self.google_id = idinfo.get('sub')
    self.email_verified = idinfo.get('email_verified')
    self.last_login_google = timezone.now()
    self.save()
class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=255, unique=True)
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Session for {self.user.username} - Expires: {self.expires_at}"
