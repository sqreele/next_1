# admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Property, Room, Topic, Job, JobImage, UserProfile

class JobImageInline(admin.TabularInline):
    model = JobImage
    readonly_fields = ['image_preview', 'uploaded_by', 'uploaded_at']
    extra = 0

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "No Image"
    
    image_preview.short_description = 'Preview'

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_id', 'get_topics', 'status', 'priority', 
                   'user', 'updated_by', 'created_at', 'updated_at']
    list_filter = ['status', 'priority', 'is_defective', 'created_at', 'updated_at']
    search_fields = ['job_id', 'description', 'user__username', 'updated_by__username']
    readonly_fields = ['job_id', 'created_at', 'updated_at', 'completed_at']
    filter_horizontal = ['rooms', 'topics']
    inlines = [JobImageInline]
    fieldsets = (
        ('Job Info', {
            'fields': ('job_id', 'description', 'remarks', 'status', 'priority', 'is_defective')
        }),
        ('Users', {
            'fields': ('user', 'updated_by')
        }),
        ('Related Items', {
            'fields': ('rooms', 'topics')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )
    
    def get_topics(self, obj):
        return ", ".join([topic.title for topic in obj.topics.all()])
    
    get_topics.short_description = 'Topics'

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['property_id', 'name', 'created_at', 'get_users_count']
    search_fields = ['property_id', 'name', 'description']
    filter_horizontal = ['users']
    readonly_fields = ['property_id', 'created_at']
    
    def get_users_count(self, obj):
        return obj.users.count()
    
    get_users_count.short_description = 'Users'

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_id', 'name', 'room_type', 'is_active', 'created_at']
    list_filter = ['room_type', 'is_active', 'created_at']
    search_fields = ['name', 'room_type']
    filter_horizontal = ['properties']
    readonly_fields = ['room_id', 'created_at']
    actions = ['activate_rooms', 'deactivate_rooms']
    
    def activate_rooms(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} rooms have been activated.")
    
    def deactivate_rooms(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} rooms have been deactivated.")
    
    activate_rooms.short_description = "Activate selected rooms"
    deactivate_rooms.short_description = "Deactivate selected rooms"

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['title', 'get_jobs_count']
    search_fields = ['title', 'description']
    
    def get_jobs_count(self, obj):
        return obj.jobs.count()
    
    get_jobs_count.short_description = 'Jobs'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'positions', 'image_preview']
    search_fields = ['user__username', 'positions']
    filter_horizontal = ['properties']
    raw_id_fields = ['user']
    
    def image_preview(self, obj):
        if obj.profile_image:
            return format_html('<img src="{}" width="50" height="50" style="border-radius: 50%;" />', obj.profile_image.url)
        return "No Image"
    
    image_preview.short_description = 'Profile Image'
