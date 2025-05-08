from rest_framework import serializers
from .models import Room, Topic, JobImage, Job, Property, UserProfile, Session, PreventiveMaintenance
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'email', 'is_staff']
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



class PreventiveMaintenanceSerializer(serializers.ModelSerializer):
    """Serializer for list view (with fewer fields)"""
    pmtitle =serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    topics = TopicSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'pm_id', 'scheduled_date', 'completed_date', 
            'frequency', 'next_due_date', 'topics', 'is_overdue', 
            'created_by', 'days_remaining'
        ]
    
    def get_is_overdue(self, obj):
        """Check if maintenance is overdue"""
        from django.utils import timezone
        if not obj.completed_date and obj.scheduled_date < timezone.now():
            return True
        return False
    
    def get_days_remaining(self, obj):
        """Calculate days remaining until scheduled date or next due date"""
        from django.utils import timezone
        import math
        
        now = timezone.now()
        
        if obj.completed_date:
            # If completed, show days until next due date
            if obj.next_due_date:
                delta = obj.next_due_date - now
                return math.ceil(delta.total_seconds() / 86400)  # Convert to days and round up
            return None
        else:
            # If not completed, show days until scheduled date
            delta = obj.scheduled_date - now
            return math.ceil(delta.total_seconds() / 86400)  # Convert to days and round up


class PreventiveMaintenanceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single item view, creation and updates"""
    pmtitle =serializers.SerializerMethodField()
    before_image_url = serializers.SerializerMethodField()
    after_image_url = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = PreventiveMaintenance
        fields = [
            'pm_id', 'job', 'topics', 'scheduled_date', 'completed_date',
            'frequency', 'custom_days', 'next_due_date',
            'before_image', 'after_image', 'before_image_url', 'after_image_url',
            'notes', 'created_by', 'updated_at', 'is_overdue', 'days_remaining'
        ]
        read_only_fields = ['pm_id', 'created_by', 'updated_at', 'next_due_date']
    
    def get_before_image_url(self, obj):
        """Get the full URL for the before image"""
        if obj.before_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.before_image.url)
            return obj.before_image.url
        return None
    
    def get_after_image_url(self, obj):
        """Get the full URL for the after image"""
        if obj.after_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.after_image.url)
            return obj.after_image.url
        return None
    
    def get_is_overdue(self, obj):
        """Check if maintenance is overdue"""
        from django.utils import timezone
        if not obj.completed_date and obj.scheduled_date < timezone.now():
            return True
        return False
    
    def get_days_remaining(self, obj):
        """Calculate days remaining until scheduled date or next due date"""
        from django.utils import timezone
        import math
        
        now = timezone.now()
        
        if obj.completed_date:
            # If completed, show days until next due date
            if obj.next_due_date:
                delta = obj.next_due_date - now
                return math.ceil(delta.total_seconds() / 86400)  # Convert to days and round up
            return None
        else:
            # If not completed, show days until scheduled date
            delta = obj.scheduled_date - now
            return math.ceil(delta.total_seconds() / 86400)  # Convert to days and round up
    
    def validate(self, data):
        """Custom validation for form data"""
        frequency = data.get('frequency')
        custom_days = data.get('custom_days')
        
        # Validate custom frequency
        if frequency == 'custom' and not custom_days:
            raise serializers.ValidationError({
                'custom_days': 'Custom days value is required when frequency is set to Custom'
            })
        
        # Validate completed date in relation to scheduled date
        scheduled_date = data.get('scheduled_date')
        completed_date = data.get('completed_date')
        
        if scheduled_date and completed_date and completed_date < scheduled_date:
            raise serializers.ValidationError({
                'completed_date': 'Completion date cannot be earlier than scheduled date'
            })
        
        return data
    
class UserSerializer(serializers.HyperlinkedModelSerializer): 
        class Meta:
            model = User
            fields = ['url', 'username', 'email', 'is_staff']
    