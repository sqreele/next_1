from rest_framework import serializers
from .models import Room, Topic, JobImage, Job, Property, UserProfile, Session,PreventiveMaintenance
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

# Moved RoomSerializer to the top since it’s used in PropertySerializer and JobSerializer
class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

class PropertyPMStatusSerializer(serializers.ModelSerializer):
    """Serializer for property preventive maintenance status endpoint"""
    is_preventivemaintenance = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Property
        fields = ['property_id', 'is_preventivemaintenance']
class PropertySerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)

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
        from .serializers import RoomSerializer  # Import here to avoid circular import
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
            rooms__property=obj,
            is_preventivemaintenance=True
        ).exists()
        
        return has_pm_jobs   


class UserProfileSerializer(serializers.ModelSerializer):
    properties = PropertySerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    created_at = serializers.DateTimeField(source='user.date_joined', read_only=True)  # Explicitly include created_at

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
            'topic_data', 'room_id', 'image_urls','is_preventivemaintenance'
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
        print("Response data:", data)
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
class PreventiveMaintenanceSerializer(serializers.ModelSerializer):
    job = serializers.SlugRelatedField(
        slug_field='job_id',
        queryset=Job.objects.all()
    )
    before_image = serializers.PrimaryKeyRelatedField(
        queryset=JobImage.objects.all(),
        required=False,
        allow_null=True
    )
    after_image = serializers.PrimaryKeyRelatedField(
        queryset=JobImage.objects.all(),
        required=False,
        allow_null=True
    )
    created_by = serializers.SlugRelatedField(
        slug_field='username',
        read_only=True
    )
    job_details = serializers.SerializerMethodField()
    before_image_url = serializers.SerializerMethodField()
    after_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PreventiveMaintenance
        fields = [
            'pm_id', 'job', 'scheduled_date', 'completed_date', 
            'frequency', 'custom_days', 'next_due_date', 
            'before_image', 'after_image', 'notes', 
            'created_by', 'updated_at', 'job_details',
            'before_image_url', 'after_image_url'
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
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # Set created_by to the current user
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        # Ensure the job is marked as preventive maintenance
        job = validated_data.get('job')
        if job and not job.is_preventivemaintenance:
            job.is_preventivemaintenance = True
            job.save()
        
        return super().create(validated_data)


class PreventiveMaintenanceCreateUpdateSerializer(serializers.ModelSerializer):
    job_id = serializers.CharField(write_only=True)
    before_image_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    after_image_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'job_id', 'scheduled_date', 'frequency', 
            'custom_days', 'notes', 'before_image_id', 'after_image_id'
        ]
    
    def validate_job_id(self, value):
        try:
            job = Job.objects.get(job_id=value)
            return value
        except Job.DoesNotExist:
            raise serializers.ValidationError("Job with this ID does not exist")
    
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
        job_id = validated_data.pop('job_id')
        before_image_id = validated_data.pop('before_image_id', None)
        after_image_id = validated_data.pop('after_image_id', None)
        
        # Get the job
        job = Job.objects.get(job_id=job_id)
        
        # Mark job as preventive maintenance
        if not job.is_preventivemaintenance:
            job.is_preventivemaintenance = True
            job.save()
        
        # Get current user from context
        request = self.context.get('request')
        user = request.user if request else None
        
        # Get images if IDs provided
        before_image = JobImage.objects.get(id=before_image_id) if before_image_id else None
        after_image = JobImage.objects.get(id=after_image_id) if after_image_id else None
        
        # Create PM record
        pm = PreventiveMaintenance.objects.create(
            job=job,
            created_by=user,
            before_image=before_image,
            after_image=after_image,
            **validated_data
        )
        
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
        
        # Update other fields
        for key, value in validated_data.items():
            setattr(instance, key, value)
        
        instance.save()
        return instance


class PreventiveMaintenanceCompleteSerializer(serializers.Serializer):
    completed_date = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    after_image_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_after_image_id(self, value):
        if value:
            try:
                JobImage.objects.get(id=value)
                return value
            except JobImage.DoesNotExist:
                raise serializers.ValidationError("Image with this ID does not exist")
        return value
    
    def update(self, instance, validated_data):
        # Mark as completed
        instance.completed_date = validated_data.get('completed_date', timezone.now())
        
        # Update notes if provided
        if 'notes' in validated_data:
            instance.notes = validated_data['notes']
        
        # Update after image if provided
        if 'after_image_id' in validated_data and validated_data['after_image_id']:
            after_image = JobImage.objects.get(id=validated_data['after_image_id'])
            instance.after_image = after_image
        
        # Calculate next due date
        instance.calculate_next_due_date()
        instance.save()
        
        return instance


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