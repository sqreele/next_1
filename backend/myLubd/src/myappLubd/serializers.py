from rest_framework import serializers
from .models import Room, Topic, JobImage, Job, Property, UserProfile, Session, PreventiveMaintenance
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

# Room serializer defined first to avoid circular import issues
class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

class PropertyPMStatusSerializer(serializers.ModelSerializer):
    """Serializer for property preventive maintenance status endpoint"""
    is_preventivemaintenance = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Property
        fields = ['property_id', 'name', 'is_preventivemaintenance']

class PropertySerializer(serializers.ModelSerializer):
    rooms = serializers.SerializerMethodField()
    is_preventivemaintenance = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            'id',
            'property_id',
            'name',
            'description',
            'users',
            'created_at',
            'rooms',
            'is_preventivemaintenance',
        ]
        read_only_fields = ['created_at', 'is_preventivemaintenance']
    
    def get_rooms(self, obj):
        """Get rooms for this property"""
        rooms = obj.rooms.all()
        return RoomSerializer(rooms, many=True, context=self.context).data
    
    def get_is_preventivemaintenance(self, obj):
        """
        Check if this property has any preventive maintenance jobs
        Only calculated if explicitly requested to avoid extra queries
        """
        # Check if we need to calculate PM status
        calculate_pm = self.context.get('calculate_pm', False)
        if not calculate_pm:
            return None
            
        # Get the PM status as efficiently as possible
        has_pm_jobs = Job.objects.filter(
            rooms__properties=obj,  # Consistent field name
            is_preventivemaintenance=True
        ).exists()
        
        return has_pm_jobs

class UserProfileSerializer(serializers.ModelSerializer):
    properties = PropertySerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    created_at = serializers.DateTimeField(source='user.date_joined', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'profile_image',
            'positions',
            'properties',
            'created_at',
        ]
        read_only_fields = ['id', 'username', 'email', 'created_at']

class JobImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = JobImage
        fields = ['id', 'image_url', 'uploaded_by', 'uploaded_at']

    def get_image_url(self, obj):
        """Return the absolute URL for the WebP image."""
        if obj.image:
            return self.context['request'].build_absolute_uri(obj.image.url)
        return None

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['title', 'description', 'id']

class JobSerializer(serializers.ModelSerializer):
    updated_by = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)
    images = JobImageSerializer(source='job_images', many=True, read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    profile_image = UserProfileSerializer(source='user.userprofile', read_only=True)
    room_type = serializers.CharField(source='room.room_type', read_only=True)
    name = serializers.CharField(source='room.name', read_only=True)
    rooms = RoomSerializer(many=True, read_only=True)
    topic_data = serializers.JSONField(write_only=True)
    room_id = serializers.IntegerField(write_only=True)
    image_urls = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'user', 'updated_by', 'description', 'status', 'priority',
            'remarks', 'created_at', 'updated_at', 'completed_at', 'is_defective',
            'rooms', 'topics', 'images', 'profile_image', 'room_type', 'name',
            'topic_data', 'room_id', 'image_urls', 'is_preventivemaintenance'
        ]
        read_only_fields = ['id', 'job_id', 'user', 'created_at', 'updated_at', 'completed_at', 'images', 'topics']

    def get_image_urls(self, obj):
        """Return a list of full URLs for all images associated with the job."""
        request = self.context.get('request')
        if request and obj.job_images.exists():
            return [request.build_absolute_uri(image.image.url) for image in obj.job_images.all()]
        return []

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be logged in to create a job")

        validated_data.pop('user', None)
        validated_data.pop('username', None)
        validated_data.pop('user_id', None)

        topic_data = validated_data.pop('topic_data', None)
        room_id = validated_data.pop('room_id', None)

        if not room_id:
            raise serializers.ValidationError({'room_id': 'This field is required.'})
        if not topic_data or 'title' not in topic_data:
            raise serializers.ValidationError({'topic_data': 'This field is required and must include a title.'})

        try:
            with transaction.atomic():
                room = Room.objects.get(room_id=room_id)
                topic, _ = Topic.objects.get_or_create(
                    title=topic_data['title'],
                    defaults={'description': topic_data.get('description', '')}
                )
                job = Job.objects.create(
                    **validated_data,
                    user=request.user
                )
                job.rooms.add(room)
                job.topics.add(topic)

                images = request.FILES.getlist('images', [])
                for image in images:
                    JobImage.objects.create(
                        job=job,
                        image=image,
                        uploaded_by=request.user
                    )

                job.refresh_from_db()
                return job
        except Room.DoesNotExist:
            raise serializers.ValidationError({'room_id': 'Invalid room ID'})
        except Exception as e:
            raise serializers.ValidationError({'detail': str(e)})

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return data

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email')

    def validate(self, attrs):
        username = attrs.get('username', '')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "A user with that username already exists."})

        email = attrs.get('email', '')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with that email already exists."})

        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        # Use get_or_create to avoid duplicate UserProfile
        UserProfile.objects.get_or_create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if not username or not password:
            raise serializers.ValidationError("Both username and password are required.")

        return attrs

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = [
            'session_token',
            'access_token',
            'refresh_token',
            'expires_at',
            'created_at',
        ]
        read_only_fields = ['created_at']

# ----- Preventive Maintenance Serializers -----

class PreventiveMaintenanceListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing preventive maintenance records"""
    job_id = serializers.CharField(source='job.job_id')
    job_description = serializers.CharField(source='job.description', read_only=True)
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'pm_id', 'job_id', 'job_description', 'scheduled_date', 
            'completed_date', 'frequency', 'next_due_date', 'status'
        ]
    
    def get_status(self, obj):
        if obj.completed_date:
            return "completed"
        elif obj.scheduled_date < timezone.now():
            return "overdue"
        else:
            return "scheduled"

class PreventiveMaintenanceSerializer(serializers.ModelSerializer):
    """Full serializer for retrieving preventive maintenance details"""
    job_details = serializers.SerializerMethodField()
    creator_name = serializers.CharField(source='created_by.username', read_only=True)
    before_image = JobImageSerializer(read_only=True)
    after_image = JobImageSerializer(read_only=True)
    before_image_url = serializers.SerializerMethodField()
    after_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'pm_id', 'job', 'scheduled_date', 'completed_date', 
            'frequency', 'custom_days', 'next_due_date', 
            'before_image', 'after_image', 'notes', 
            'created_by', 'creator_name', 'updated_at',
            'job_details', 'before_image_url', 'after_image_url'
        ]
        read_only_fields = ['pm_id', 'created_by', 'next_due_date', 'updated_at']
    
    def get_job_details(self, obj):
        """Return simplified job details"""
        return {
            'job_id': obj.job.job_id,
            'description': obj.job.description,
            'status': obj.job.status,
            'priority': obj.job.priority
        }
    
    def get_before_image_url(self, obj):
        """Return the URL for the before image if it exists"""
        if obj.before_image and obj.before_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.before_image.image.url)
        return None
    
    def get_after_image_url(self, obj):
        """Return the URL for the after image if it exists"""
        if obj.after_image and obj.after_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.after_image.image.url)
        return None

class PreventiveMaintenanceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating preventive maintenance records"""
    job_id = serializers.CharField(write_only=True, required=False)
    before_image_file = serializers.ImageField(required=False, write_only=True)
    after_image_file = serializers.ImageField(required=False, write_only=True)
    before_image_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    after_image_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    topics = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.all(), 
        many=True, 
        required=False
    )
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'job', 'job_id', 'scheduled_date', 'frequency', 
            'custom_days', 'notes', 'before_image_id', 'after_image_id',
            'before_image_file', 'after_image_file', 'topics'
        ]
    
    def validate(self, data):
        # Validate frequency and custom_days
        if data.get('frequency') == 'custom' and not data.get('custom_days'):
            raise serializers.ValidationError(
                "Custom days are required when frequency is set to 'custom'"
            )
        
        # Check that either job or job_id is provided
        if not data.get('job') and not data.get('job_id'):
            raise serializers.ValidationError("Either job or job_id must be provided")
            
        return data
    
    def validate_job_id(self, value):
        if value:
            try:
                Job.objects.get(job_id=value)
                return value
            except Job.DoesNotExist:
                raise serializers.ValidationError("Job with this ID does not exist")
        return value
    
    def validate_before_image_id(self, value):
        if value:
            try:
                JobImage.objects.get(id=value)
                return value
            except JobImage.DoesNotExist:
                raise serializers.ValidationError("Image with this ID does not exist")
        return value
    
    def validate_after_image_id(self, value):
        if value:
            try:
                JobImage.objects.get(id=value)
                return value
            except JobImage.DoesNotExist:
                raise serializers.ValidationError("Image with this ID does not exist")
        return value
    
    def create(self, validated_data):
        # Handle job_id
        job_id = validated_data.pop('job_id', None)
        job = validated_data.get('job')
        
        if job_id and not job:
            job = Job.objects.get(job_id=job_id)
            validated_data['job'] = job
        
        # Remove file fields as they're handled separately
        before_image_file = validated_data.pop('before_image_file', None)
        after_image_file = validated_data.pop('after_image_file', None)
        before_image_id = validated_data.pop('before_image_id', None)
        after_image_id = validated_data.pop('after_image_id', None)
        topics = validated_data.pop('topics', [])
        
        # Mark job as preventive maintenance
        if job and not job.is_preventivemaintenance:
            job.is_preventivemaintenance = True
            job.save()
        
        # Get current user from context
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        
        # Get images if IDs provided
        before_image = JobImage.objects.get(id=before_image_id) if before_image_id else None
        after_image = JobImage.objects.get(id=after_image_id) if after_image_id else None
        
        # Create PM record
        pm = PreventiveMaintenance.objects.create(
            created_by=user,
            before_image=before_image,
            after_image=after_image,
            **validated_data
        )
        
        # Add topics
        if topics:
            pm.topics.set(topics)
        
        # Process image files if provided
        if request:
            if before_image_file:
                job_image = JobImage.objects.create(
                    job=pm.job,
                    image=before_image_file,
                    uploaded_by=user
                )
                pm.before_image = job_image
                pm.save(update_fields=['before_image'])
                
            if after_image_file:
                job_image = JobImage.objects.create(
                    job=pm.job,
                    image=after_image_file,
                    uploaded_by=user
                )
                pm.after_image = job_image
                pm.save(update_fields=['after_image'])
        
        return pm
    
    def update(self, instance, validated_data):
        # Handle job_id if present
        if 'job_id' in validated_data:
            job_id = validated_data.pop('job_id')
            job = Job.objects.get(job_id=job_id)
            instance.job = job
            
            # Mark job as preventive maintenance
            if not job.is_preventivemaintenance:
                job.is_preventivemaintenance = True
                job.save()
        
        # Remove file fields as they're handled separately
        before_image_file = validated_data.pop('before_image_file', None)
        after_image_file = validated_data.pop('after_image_file', None)
        topics = validated_data.pop('topics', None)
        
        # Handle image IDs
        if 'before_image_id' in validated_data:
            before_image_id = validated_data.pop('before_image_id')
            if before_image_id:
                instance.before_image = JobImage.objects.get(id=before_image_id)
            else:
                instance.before_image = None
                
        if 'after_image_id' in validated_data:
            after_image_id = validated_data.pop('after_image_id')
            if after_image_id:
                instance.after_image = JobImage.objects.get(id=after_image_id)
            else:
                instance.after_image = None
        
        # Handle topics if provided
        if topics is not None:
            instance.topics.set(topics)
        
        # Update other fields
        for key, value in validated_data.items():
            setattr(instance, key, value)
        
        # Process image files if provided
        request = self.context.get('request')
        if request:
            user = request.user if hasattr(request, 'user') else None
            
            if before_image_file:
                job_image = JobImage.objects.create(
                    job=instance.job,
                    image=before_image_file,
                    uploaded_by=user
                )
                instance.before_image = job_image
                
            if after_image_file:
                job_image = JobImage.objects.create(
                    job=instance.job,
                    image=after_image_file,
                    uploaded_by=user
                )
                instance.after_image = job_image
        
        # Recalculate next_due_date if completed_date changed
        if 'completed_date' in validated_data and instance.completed_date and not instance.next_due_date:
            instance.calculate_next_due_date()
        
        instance.save()
        return instance

class PreventiveMaintenanceCompleteSerializer(serializers.ModelSerializer):
    """Serializer for marking a preventive maintenance task as completed"""
    completed_date = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    after_image_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    after_image_file = serializers.ImageField(required=False, write_only=True)
    
    class Meta:
        model = PreventiveMaintenance
        fields = ['completed_date', 'notes', 'after_image_id', 'after_image_file']
    
    def validate_after_image_id(self, value):
        if value:
            try:
                JobImage.objects.get(id=value)
                return value
            except JobImage.DoesNotExist:
                raise serializers.ValidationError("Image with this ID does not exist")
        return value
    
    def update(self, instance, validated_data):
        # Set completed date if not provided
        if 'completed_date' not in validated_data or not validated_data['completed_date']:
            validated_data['completed_date'] = timezone.now()
        
        # Remove file fields as they're handled separately
        after_image_file = validated_data.pop('after_image_file', None)
        
        # Update notes if provided
        if 'notes' in validated_data:
            instance.notes = validated_data['notes']
        
        # Update completed date
        instance.completed_date = validated_data['completed_date']
        
        # Update after image if ID provided
        if 'after_image_id' in validated_data and validated_data['after_image_id']:
            after_image = JobImage.objects.get(id=validated_data['after_image_id'])
            instance.after_image = after_image
        
        # Process image file if provided
        request = self.context.get('request')
        if request and after_image_file:
            user = request.user if hasattr(request, 'user') else None
            job_image = JobImage.objects.create(
                job=instance.job,
                image=after_image_file,
                uploaded_by=user
            )
            instance.after_image = job_image
        
        # Calculate next due date
        instance.calculate_next_due_date()
        instance.save()
        
        return instance
class UserSerializer(serializers.HyperlinkedModelSerializer): 
        class Meta:
            model = User
            fields = ['url', 'username', 'email', 'is_staff']
    