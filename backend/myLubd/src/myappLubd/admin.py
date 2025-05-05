from django.contrib import admin
from django.utils.html import format_html
from .models import Property, Room, Topic, Job, JobImage, UserProfile,PreventiveMaintenance
from django.utils import timezone
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
                   'user', 'updated_by', 'created_at', 'updated_at', 'is_preventivemaintenance']
    list_filter = ['status', 'priority', 'is_defective', 'created_at', 'updated_at']
    search_fields = ['job_id', 'description', 'user__username', 'updated_by__username']
    readonly_fields = ['job_id', 'created_at', 'updated_at', 'completed_at']
    filter_horizontal = ['rooms', 'topics']
    inlines = [JobImageInline]
    fieldsets = (
        ('Job Info', {
            'fields': ('job_id', 'description', 'remarks', 'status', 'priority', 'is_defective', 'is_preventivemaintenance')
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
class HasPreventiveMaintenanceFilter(admin.SimpleListFilter):
    title = 'has preventive maintenance'
    parameter_name = 'has_pm'
    
    def lookups(self, request, model_admin):
        return (
            ('yes', 'Yes'),
            ('no', 'No'),
        )
    
    def queryset(self, request, queryset):
        # Find IDs that have PM
        if self.value() == 'yes':
            return queryset.filter(jobs__is_preventivemaintenance=True).distinct()
        if self.value() == 'no':
            return queryset.exclude(jobs__is_preventivemaintenance=True)
        return queryset
class PreventiveMaintenanceInline(admin.TabularInline):
    model = PreventiveMaintenance
    extra = 0
    fields = ('pm_id', 'scheduled_date', 'frequency', 'completed_date', 'next_due_date')
    readonly_fields = ('pm_id', 'next_due_date')
    show_change_link = True
    can_delete = False
    max_num = 10
    verbose_name = "Preventive Maintenance Schedule"
    verbose_name_plural = "Preventive Maintenance Schedules"  
@admin.register(PreventiveMaintenance)
class PreventiveMaintenanceAdmin(admin.ModelAdmin):
    list_display = (
        'pm_id', 
        'get_job_id', 
        'scheduled_date', 
        'completed_date', 
        'frequency', 
        'next_due_date',
        'get_status'
    )
    list_filter = (
        'frequency', 
        ('completed_date', admin.EmptyFieldListFilter),
        'scheduled_date',
    )
    search_fields = ('pm_id', 'job__job_id', 'notes')
    date_hierarchy = 'scheduled_date'
    readonly_fields = ('pm_id', 'next_due_date')
    raw_id_fields = ('job', 'before_image', 'after_image', 'created_by')
    fieldsets = (
        ('Identification', {
            'fields': ('pm_id', 'job', 'created_by')
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'frequency', 'custom_days', 'completed_date', 'next_due_date')
        }),
        ('Documentation', {
            'fields': ('notes', 'before_image', 'after_image')
        }),
    )
    
    def get_job_id(self, obj):
        return obj.job.job_id
    get_job_id.short_description = 'Job ID'
    get_job_id.admin_order_field = 'job__job_id'
    
    def get_status(self, obj):
        if obj.completed_date:
            return "Completed"
        elif obj.scheduled_date < timezone.now():
            return "Overdue"
        else:
            return "Scheduled"
    get_status.short_description = 'Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('job', 'created_by')
    
    def save_model(self, request, obj, form, change):
        if not change:  # If this is a new object
            obj.created_by = request.user
        
        # Ensure the job is marked as preventive maintenance
        if not obj.job.is_preventivemaintenance:
            obj.job.is_preventivemaintenance = True
            obj.job.save()
            
        super().save_model(request, obj, form, change)
    
    # Add action to mark selected maintenance as completed
    actions = ['mark_completed']
    
    def mark_completed(self, request, queryset):
        now = timezone.now()
        updated = 0
        
        for pm in queryset:
            if not pm.completed_date:
                pm.completed_date = now
                pm.calculate_next_due_date()
                pm.save()
                updated += 1
        
        self.message_user(
            request, 
            f"{updated} preventive maintenance tasks marked as completed."
        )
    mark_completed.short_description = "Mark selected tasks as completed"    