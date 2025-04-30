from rest_framework import serializers
from .models import Room, Topic, JobImage, Job, Property, UserProfile, Session
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction


# Moved RoomSerializer to the top since it’s used in PropertySerializer and JobSerializer
class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


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
        ]
        read_only_fields = ['created_at']


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


# Add or update in your serializers.py file

class JobSerializer(serializers.ModelSerializer):
    updated_by = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)
<<<<<<< HEAD
=======
    images = JobImageSerializer(source='job_images', many=True, read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    profile_image = serializers.SerializerMethodField()
    room_type = serializers.CharField(source='room.room_type', read_only=True)
    name = serializers.CharField(source='room.name', read_only=True)
    rooms = RoomSerializer(many=True, read_only=True)
    topic_data = serializers.JSONField(write_only=True, required=False)  # Made optional for updating
    room_id = serializers.IntegerField(write_only=True, required=False)  # Made optional for updating
    image_urls = serializers.SerializerMethodField()
    property_id = serializers.CharField(write_only=True, required=False)
    is_preventivemaintenance = serializers.BooleanField(required=False, default=False)
    property_name = serializers.SerializerMethodField()  # Added for convenience
    due_date = serializers.DateTimeField(required=False, allow_null=True)  # Optional field for PM schedules

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'user', 'updated_by', 'description', 'status', 'priority',
            'remarks', 'created_at', 'updated_at', 'completed_at', 'is_defective',
            'is_preventivemaintenance', 'rooms', 'topics', 'images', 'profile_image', 
            'room_type', 'name', 'topic_data', 'room_id', 'image_urls', 'property_id',
            'property_name', 'due_date'
        ]
        read_only_fields = ['id', 'job_id', 'user', 'created_at', 'updated_at', 'completed_at', 'images', 'topics']

    def get_image_urls(self, obj):
        """Return a list of full URLs for all images associated with the job."""
        request = self.context.get('request')
        if request and obj.job_images.exists():
            return [request.build_absolute_uri(image.image.url) for image in obj.job_images.all()]
        return []
        
    def get_profile_image(self, obj):
        """Return the user's profile image URL if available."""
        request = self.context.get('request')
        if request and hasattr(obj.user, 'userprofile') and obj.user.userprofile.profile_image:
            return request.build_absolute_uri(obj.user.userprofile.profile_image.url)
        return None
        
    def get_property_name(self, obj):
        """Return the property name if available."""
        if hasattr(obj, 'property') and obj.property:
            return obj.property.name
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be logged in to create a job")

        validated_data.pop('user', None)
        validated_data.pop('username', None)
        validated_data.pop('user_id', None)

        topic_data = validated_data.pop('topic_data', None)
        room_id = validated_data.pop('room_id', None)
        property_id = validated_data.pop('property_id', None)

        # For preventive maintenance jobs, room_id is required
        if not room_id and validated_data.get('is_preventivemaintenance', False):
            raise serializers.ValidationError({'room_id': 'This field is required for preventive maintenance jobs.'})
            
        # For preventive maintenance jobs, topic_data is required
        if not topic_data and validated_data.get('is_preventivemaintenance', False):
            raise serializers.ValidationError({'topic_data': 'This field is required for preventive maintenance jobs.'})

        try:
            with transaction.atomic():
                property_obj = None
                
                # Get or create the property if property_id is provided
                if property_id:
                    try:
                        property_obj = Property.objects.get(property_id=property_id)
                    except Property.DoesNotExist:
                        raise serializers.ValidationError({'property_id': 'Invalid property ID'})
                
                # Get the room if room_id is provided
                room = None
                if room_id:
                    try:
                        room = Room.objects.get(id=room_id)
                        # If property_id wasn't provided but room has a property, use that
                        if not property_obj and hasattr(room, 'property') and room.property:
                            property_obj = room.property
                    except Room.DoesNotExist:
                        raise serializers.ValidationError({'room_id': 'Invalid room ID'})
                
                # Create topic if topic_data is provided
                topic = None
                if topic_data and 'title' in topic_data:
                    topic, _ = Topic.objects.get_or_create(
                        title=topic_data['title'],
                        defaults={'description': topic_data.get('description', '')}
                    )
                
                # Create the job
                job = Job.objects.create(
                    **validated_data,
                    user=request.user,
                    updated_by=request.user,
                    property=property_obj
                )
                
                # Add room and topic if available
                if room:
                    job.rooms.add(room)
                if topic:
                    job.topics.add(topic)

                # Process images if provided
                images = request.FILES.getlist('images', [])
                for image in images:
                    JobImage.objects.create(
                        job=job,
                        image=image,
                        uploaded_by=request.user
                    )

                job.refresh_from_db()
                return job
        except Exception as e:
            raise serializers.ValidationError({'detail': str(e)})

    def update(self, instance, validated_data):
        # Handle topic_data and room_id if provided
        topic_data = validated_data.pop('topic_data', None)
        room_id = validated_data.pop('room_id', None)
        property_id = validated_data.pop('property_id', None)
        
        # Update the job instance with other data
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle property if provided
        if property_id:
            try:
                property_obj = Property.objects.get(property_id=property_id)
                instance.property = property_obj
            except Property.DoesNotExist:
                pass
        
        # Handle room if provided
        if room_id:
            try:
                room = Room.objects.get(id=room_id)
                instance.rooms.add(room)
            except Room.DoesNotExist:
                pass
        
        # Handle topic if provided
        if topic_data and 'title' in topic_data:
            topic, _ = Topic.objects.get_or_create(
                title=topic_data['title'],
                defaults={'description': topic_data.get('description', '')}
            )
            instance.topics.add(topic)
        
        instance.save()
        return instance
    updated_by = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)
    images = serializers.SerializerMethodField()
    topics = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    room_type = serializers.CharField(source='room.room_type', read_only=True)
    name = serializers.CharField(source='room.name', read_only=True)
    rooms = serializers.SerializerMethodField()
    topic_data = serializers.JSONField(write_only=True)
    room_id = serializers.IntegerField(write_only=True)
    image_urls = serializers.SerializerMethodField()
    is_preventivemaintenance = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'user', 'updated_by', 'description', 'status', 'priority',
            'remarks', 'created_at', 'updated_at', 'completed_at', 'is_defective',
            'rooms', 'topics', 'images', 'profile_image', 'room_type', 'name',
            'topic_data', 'room_id', 'image_urls', 'is_preventivemaintenance'
        ]
        read_only_fields = ['id', 'job_id', 'user', 'created_at', 'updated_at', 'completed_at', 'images', 'topics']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Check if this is a list view request
        is_list_view = self._is_list_view()
        
        # For list views, remove expensive serialization fields
        if is_list_view:
            # Keep only the essential fields for list views
            fields_to_keep = [
                'id', 'job_id', 'user', 'description', 'status', 'priority',
                'created_at', 'completed_at', 'is_preventivemaintenance'
            ]
            
            # Remove all other fields
            for field_name in list(self.fields.keys()):
                if field_name not in fields_to_keep:
                    self.fields.pop(field_name, None)

    def _is_list_view(self):
        """Determine if this is a list view request"""
        request = self.context.get('request')
        if not request:
            return False
            
        # Check for detail=False in action context
        action = self.context.get('action', None)
        if action == 'list':
            return True
            
        # Check if lookup param exists in kwargs
        view = self.context.get('view', None)
        if view and hasattr(view, 'lookup_field') and hasattr(view, 'kwargs'):
            if view.lookup_field not in view.kwargs:
                return True
                
        # Check if many=True in init args
        if getattr(self, 'many', False):
            return True
            
        return False
        
    def get_images(self, obj):
        """Only load images for detail views"""
        if self._is_list_view():
            return []
        return JobImageSerializer(obj.job_images.all(), many=True, context=self.context).data
    
    def get_topics(self, obj):
        """Only load topics for detail views"""
        if self._is_list_view():
            return []
        return TopicSerializer(obj.topics.all(), many=True).data
    
    def get_profile_image(self, obj):
        """Only load profile image for detail views"""
        if self._is_list_view():
            return None
        if not hasattr(obj, 'user') or not obj.user or not hasattr(obj.user, 'userprofile'):
            return None
        return UserProfileSerializer(obj.user.userprofile, context=self.context).data
    
    def get_rooms(self, obj):
        """Only load rooms for detail views"""
        if self._is_list_view():
            return []
        return RoomSerializer(obj.rooms.all(), many=True).data

    def get_image_urls(self, obj):
        """Return a list of full URLs for all images associated with the job."""
        if self._is_list_view():
            return []
            
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
        # Commented out the print statement to reduce console clutter
        # print("Response data:", data)
        return data
    updated_by = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)
>>>>>>> 63bc28f (addfixthem)
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
            'topic_data', 'room_id', 'image_urls'
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
