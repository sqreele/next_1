from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    Property,
    Room,
    Topic,
    Job,
    JobImage,
    UserProfile,
    PreventiveMaintenance,
    Session
)

# Inlines

class JobImageInline(admin.TabularInline):
    model = JobImage
    extra = 1
    readonly_fields = ['image_preview', 'uploaded_at']
    fields = ['image', 'image_preview', 'uploaded_by', 'uploaded_at']

    def image_preview(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "No Image / Image not saved yet"
    image_preview.short_description = 'Preview'


# Remove PreventiveMaintenanceInline since it's no longer related to Job model

# ModelAdmins

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_id', 'get_topics_display', 'status', 'priority',
                    'user', 'updated_by', 'created_at', 'updated_at', 'is_preventivemaintenance']
    list_filter = ['status', 'priority', 'is_defective', 'created_at', 'updated_at', 'is_preventivemaintenance']
    search_fields = ['job_id', 'description', 'user__username', 'updated_by__username', 'topics__title']
    readonly_fields = ['job_id', 'created_at', 'updated_at', 'completed_at', 'updated_by']
    filter_horizontal = ['rooms', 'topics']
    inlines = [JobImageInline]  # Removed PreventiveMaintenanceInline
    fieldsets = (
        ('Job Info', {
            'fields': ('job_id', 'description', 'remarks', 'status', 'priority', 'is_defective', 'is_preventivemaintenance')
        }),
        ('Assignment', {
            'fields': ('user', 'updated_by')
        }),
        ('Related Items', {
            'fields': ('rooms', 'topics')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )

    def get_topics_display(self, obj):
        return ", ".join([topic.title for topic in obj.topics.all()])
    get_topics_display.short_description = 'Topics'

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.user_id:  # If new object and user (creator) is not set
            obj.user = request.user
        if obj.pk:  # If existing object, set updated_by
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        
        for instance in instances:
            if isinstance(instance, JobImage):
                if not instance.pk and not instance.uploaded_by_id:  # New JobImage
                    instance.uploaded_by = request.user
            
            instance.save() # Save the inline instance
            
        formset.save_m2m()


@admin.register(JobImage)
class JobImageAdmin(admin.ModelAdmin):
    list_display = ('image_preview', 'job_link', 'uploaded_by', 'uploaded_at')
    list_filter = ('uploaded_at', 'uploaded_by')
    search_fields = ('job__job_id', 'uploaded_by__username')
    readonly_fields = ('image_preview', 'uploaded_at')
    raw_id_fields = ('job', 'uploaded_by')

    def image_preview(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            return format_html('<img src="{}" height="100" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image Preview'

    def job_link(self, obj):
        if obj.job:
            from django.urls import reverse
            link = reverse("admin:myappLubd_job_change", args=[obj.job.id])
            return format_html('<a href="{}">{}</a>', link, obj.job.job_id)
        return "No Associated Job"
    job_link.short_description = 'Job'
    job_link.admin_order_field = 'job'

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.uploaded_by_id: # If new and uploaded_by not set
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['property_id', 'name', 'created_at', 'get_users_count', 'is_preventivemaintenance']
    search_fields = ['property_id', 'name', 'description']
    list_filter = ['created_at', 'is_preventivemaintenance']
    filter_horizontal = ['users']
    readonly_fields = ['property_id', 'created_at']

    def get_users_count(self, obj):
        return obj.users.count()
    get_users_count.short_description = 'Assigned Users'


class HasPreventiveMaintenanceFilter(admin.SimpleListFilter):
    title = 'has preventive maintenance job'
    parameter_name = 'has_pm_job'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Yes'),
            ('no', 'No'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(jobs__is_preventivemaintenance=True).distinct()
        if self.value() == 'no':
            return queryset.exclude(jobs__is_preventivemaintenance=True).distinct()
        return queryset


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_id', 'name', 'room_type', 'is_active', 'created_at', 'get_properties_display']
    list_filter = ['room_type', 'is_active', 'created_at', HasPreventiveMaintenanceFilter]
    search_fields = ['name', 'room_type', 'properties__name']
    filter_horizontal = ['properties']
    readonly_fields = ['room_id', 'created_at']
    actions = ['activate_rooms', 'deactivate_rooms']

    def get_properties_display(self, obj):
        return ", ".join([prop.name for prop in obj.properties.all()])
    get_properties_display.short_description = 'Properties'

    def activate_rooms(self, request, queryset):
        updated_count = queryset.update(is_active=True)
        self.message_user(request, f"{updated_count} rooms have been activated.")
    activate_rooms.short_description = "Activate selected rooms"

    def deactivate_rooms(self, request, queryset):
        updated_count = queryset.update(is_active=False)
        self.message_user(request, f"{updated_count} rooms have been deactivated.")
    deactivate_rooms.short_description = "Deactivate selected rooms"


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['title', 'get_jobs_count']
    search_fields = ['title', 'description']
    list_filter = [HasPreventiveMaintenanceFilter]

    def get_jobs_count(self, obj):
        return obj.jobs.count()
    get_jobs_count.short_description = 'Associated Jobs'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'positions', 'profile_image_preview']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'positions']
    filter_horizontal = ['properties']
    raw_id_fields = ['user']
    readonly_fields = [
        'profile_image_preview', 'google_id', 'email_verified', 
        'access_token', 'refresh_token', 'login_provider'
    ]
    fieldsets = (
        (None, {'fields': ('user', 'positions', 'profile_image', 'profile_image_preview')}),
        ('Accessible Properties', {'fields': ('properties',)}),
        ('Google Authentication Details', {
            'classes': ('collapse',),
            'fields': ('google_id', 'email_verified', 'access_token', 'refresh_token', 'login_provider'),
        }),
    )
    
    def user_link(self, obj):
        from django.urls import reverse
        link = reverse("admin:auth_user_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', link, obj.user.username)
    user_link.short_description = 'User'

    def profile_image_preview(self, obj):
        if obj.profile_image and hasattr(obj.profile_image, 'url'):
            return format_html('<img src="{}" width="50" height="50" style="border-radius: 50%;" />', obj.profile_image.url)
        return "No Image"
    profile_image_preview.short_description = 'Profile Image'


@admin.register(PreventiveMaintenance)
class PreventiveMaintenanceAdmin(admin.ModelAdmin):
    list_display = (
        'pm_id',
        'pmtitle',
        'get_topics_display',
        'scheduled_date',
        'completed_date',
        'frequency',
        'next_due_date',
        'get_status_display',
        'created_by_user'
    )
    list_filter = (
        'frequency',
        ('completed_date', admin.EmptyFieldListFilter),
        'scheduled_date',
        'next_due_date',
        # Removed job__is_preventivemaintenance filter
    )
    search_fields = ('pm_id', 'notes', 'pmtitle', 'topics__title')
    date_hierarchy = 'scheduled_date'
    filter_horizontal = ['topics']  # Add this for topics many-to-many relationship
   
    readonly_fields = ('pm_id', 'next_due_date', 'before_image_preview', 'after_image_preview')
    fieldsets = (
        ('Identification', {
            'fields': ('pm_id', 'pmtitle', 'created_by')
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'frequency', 'custom_days', 'completed_date', 'next_due_date')
        }),
        ('Documentation & Images', {
            'fields': ('notes', 'before_image', 'before_image_preview', 'after_image', 'after_image_preview')
        }),
        ('Related Items', {
            'fields': ('topics',)
        }),
    )
    actions = ['mark_completed']

    def get_topics_display(self, obj):
        """Display topics associated with this PM"""
        return ", ".join([topic.title for topic in obj.topics.all()])
    get_topics_display.short_description = 'Topics'

    def get_status_display(self, obj):
        if obj.completed_date:
            return format_html('<span style="color: green;">Completed</span>')
        elif obj.scheduled_date and obj.scheduled_date < timezone.now():
             return format_html('<span style="color: red;">Overdue</span>')
        elif obj.next_due_date and obj.next_due_date < timezone.now():
             return format_html('<span style="color: orange;">Next Due Overdue</span>')
        return format_html('<span style="color: blue;">Scheduled</span>')
    get_status_display.short_description = 'Status'
    get_status_display.admin_order_field = 'completed_date'

    def created_by_user(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return "N/A"
    created_by_user.short_description = 'Created By'
    created_by_user.admin_order_field = 'created_by'

    def get_queryset(self, request):
        # Optimize queries by prefetching related objects
        return super().get_queryset(request).select_related('created_by').prefetch_related('topics')

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.created_by_id:  # If new object and created_by not set
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def mark_completed(self, request, queryset):
        now = timezone.now()
        updated_count = 0
        for pm in queryset:
            if not pm.completed_date:
                pm.completed_date = now
                pm.calculate_next_due_date()
                pm.save()
                updated_count += 1
        self.message_user(request, f"{updated_count} preventive maintenance tasks marked as completed.")
    mark_completed.short_description = "Mark selected tasks as completed"

    def before_image_preview(self, obj):
        if obj.before_image and hasattr(obj.before_image, 'url'):
            return format_html('<img src="{}" width="100" />', obj.before_image.url)
        return "No Before Image"
    before_image_preview.short_description = 'Before Image Preview'

    def after_image_preview(self, obj):
        if obj.after_image and hasattr(obj.after_image, 'url'):
            return format_html('<img src="{}" width="100" />', obj.after_image.url)
        return "No After Image"
    after_image_preview.short_description = 'After Image Preview'


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_token_short', 'expires_at', 'created_at', 'is_expired_status')
    search_fields = ('user__username', 'session_token')
    list_filter = ('expires_at', 'created_at')
    readonly_fields = ('user', 'session_token', 'access_token', 'refresh_token', 'expires_at', 'created_at')
    raw_id_fields = ('user',)

    fieldsets = (
        ('Session Info', {'fields': ('user', 'session_token', 'expires_at', 'created_at')}),
        ('Tokens (Read-Only)', {'classes': ('collapse',), 'fields': ('access_token', 'refresh_token')}),
    )

    def session_token_short(self, obj):
        return f"{obj.session_token[:20]}..." if obj.session_token else "N/A"
    session_token_short.short_description = 'Session Token (Short)'
    
    def is_expired_status(self, obj):
        return obj.is_expired()
    is_expired_status.boolean = True
    is_expired_status.short_description = 'Is Expired'
