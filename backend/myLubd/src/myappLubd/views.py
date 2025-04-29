from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from .models import UserProfile, Property, Room, Topic, Job, Session
from .serializers import (
    UserProfileSerializer, PropertySerializer, RoomSerializer, TopicSerializer, JobSerializer,
    UserSerializer  # Added for RegisterView
)
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
import logging
import json
import uuid
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)
User = get_user_model()

# ViewSets
class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

class JobViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = JobSerializer
    lookup_field = 'job_id'

    def get_queryset(self):
        """
        Optimize queryset with proper filtering, selection, and prefetching.
        """
        queryset = Job.objects.all()
        
        # Filter by property if provided
        property_id = self.request.query_params.get('property')
        if property_id:
            queryset = queryset.filter(rooms__property__property_id=property_id)
        
        # Filter by preventive maintenance flag
        is_pm = self.request.query_params.get('is_preventivemaintenance')
        if is_pm:
            is_pm_bool = is_pm.lower() == 'true'
            queryset = queryset.filter(is_preventivemaintenance=is_pm_bool)
        
        # Apply efficient prefetching to avoid N+1 queries
        queryset = queryset.select_related('user', 'updated_by', 'user__userprofile')
        queryset = queryset.prefetch_related('rooms', 'topics', 'job_images')
        
        # Apply limit if provided
        limit = self.request.query_params.get('limit')
        if limit and limit.isdigit():
            limit_val = int(limit)
            queryset = queryset[:limit_val]
            
        return queryset

    def get_object(self):
        queryset = self.get_queryset()
        filter_kwargs = {self.lookup_field: self.kwargs[self.lookup_field]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['patch'])
    def update_status(self, request, job_id=None):
        job = self.get_object()
        status_value = request.data.get('status')
        if status_value and status_value not in dict(Job.STATUS_CHOICES):
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.is_authenticated:
            job.updated_by = request.user
        
        if status_value == 'completed' and job.status != 'completed':
            job.completed_at = timezone.now()
            
        job.status = status_value
        job.save()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, updated_by=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.request.user.is_authenticated:
            instance = self.get_object()
            data = serializer.validated_data
            if 'status' in data and data['status'] == 'completed' and instance.status != 'completed':
                serializer.save(updated_by=self.request.user, completed_at=timezone.now())
            else:
                serializer.save(updated_by=self.request.user)
        else:
            serializer.save()
            
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):
        """Cache job list responses to reduce database load"""
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_page(60 * 5))
    @method_decorator(vary_on_headers("Authorization"))
    def retrieve(self, request, *args, **kwargs):
        """Cache job detail responses to reduce database load"""
        return super().retrieve(request, *args, **kwargs)
            
    @action(detail=False, methods=['get'])
    def debug_performance(self, request):
        """Debug endpoint to check query performance."""
        from django.db import connection, reset_queries
        
        # Start with a clean connection
        reset_queries()
        
        # Get query parameters
        property_id = request.query_params.get('property')
        is_pm = request.query_params.get('is_preventivemaintenance')
        
        # Start with base queryset
        queryset = Job.objects.all()
        
        # Apply filters
        if property_id:
            queryset = queryset.filter(rooms__property__property_id=property_id)
        
        if is_pm:
            is_pm_bool = is_pm.lower() == 'true'
            queryset = queryset.filter(is_preventivemaintenance=is_pm_bool)
        
        # Count jobs before optimization
        initial_count = queryset.count()
        initial_queries = len(connection.queries)
        
        # Apply optimizations
        optimized_queryset = queryset.select_related('user', 'updated_by', 'user__userprofile')
        optimized_queryset = optimized_queryset.prefetch_related('rooms', 'topics', 'job_images')
        
        # Count again with optimized query
        reset_queries()
        optimized_count = list(optimized_queryset[:10])  # Force query execution
        optimized_queries = len(connection.queries)
        
        # Get slow queries
        slow_queries = [
            {'sql': q['sql'], 'time': float(q['time'])} 
            for q in connection.queries 
            if float(q['time']) > 0.1
        ]
        
        return Response({
            'job_count': initial_count,
            'initial_query_count': initial_queries,
            'optimized_query_count': optimized_queries,
            'slow_queries': slow_queries,
            'filter_params': {
                'property_id': property_id,
                'is_preventivemaintenance': is_pm,
            }
        })
    permission_classes = [IsAuthenticated]
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    lookup_field = 'job_id'

    def get_object(self):
        queryset = self.get_queryset()
        filter_kwargs = {self.lookup_field: self.kwargs[self.lookup_field]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['patch'])
    def update_status(self, request, job_id=None):
        job = self.get_object()
        status_value = request.data.get('status')
        if status_value and status_value not in dict(Job.STATUS_CHOICES):
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.is_authenticated:
            job.updated_by = request.user
        
        if status_value == 'completed' and job.status != 'completed':
            job.completed_at = timezone.now()
            
        job.status = status_value
        job.save()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, updated_by=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.request.user.is_authenticated:
            instance = self.get_object()
            data = serializer.validated_data
            if 'status' in data and data['status'] == 'completed' and instance.status != 'completed':
                serializer.save(updated_by=self.request.user, completed_at=timezone.now())
            else:
                serializer.save(updated_by=self.request.user)
        else:
            serializer.save()

class UserProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user).prefetch_related('properties')

    @action(detail=False, methods=['get'])
    def me(self, request):
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        profile = self.get_object()
        property_id = request.data.get('property_id')
        if not property_id:
            return Response({'error': 'property_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        property = get_object_or_404(Property, property_id=property_id)
        profile.properties.add(property)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_property(self, request, pk=None):
        profile = self.get_object()
        property_id = request.data.get('property_id')
        if not property_id:
            return Response({'error': 'property_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        property = get_object_or_404(Property, property_id=property_id)
        profile.properties.remove(property)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer

    def get_queryset(self):
        return Property.objects.filter(users=self.request.user)

# Session Management Views for NextAuth
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            session = Session.objects.create(
                user=user,
                session_token=str(uuid.uuid4()),
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
                expires_at=timezone.now() + timedelta(days=30),
            )
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'session_token': session.session_token,
                'user_id': user.id,
            })
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.debug(f"Register request payload: {request.data}")
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            session = Session.objects.create(
                user=user,
                session_token=str(uuid.uuid4()),
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
                expires_at=timezone.now() + timedelta(days=30),
            )
            response_data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'session_token': session.session_token,
                'user_id': user.id,
            }
            logger.info(f"User registered: {user.username} - Response: {response_data}")
            return Response(response_data, status=status.HTTP_201_CREATED)
        logger.warning(f"Registration failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_token = request.data.get('session_token')
        if session_token:
            Session.objects.filter(session_token=session_token, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CustomSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        session = Session.objects.filter(user=request.user).first()
        if not session:
            return Response({'detail': 'No active session found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'session_token': session.session_token,
            'access_token': session.access_token,
            'refresh_token': session.refresh_token,
            'expires_at': session.expires_at,
            'created_at': session.created_at,
        })

    def post(self, request):
        refresh = RefreshToken.for_user(request.user)
        session, created = Session.objects.update_or_create(
            user=request.user,
            defaults={
                'session_token': str(uuid.uuid4()),
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'expires_at': timezone.now() + timedelta(days=30),
            }
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': request.user.id,
        })

# New RegisterView (Fix for the error)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            session = Session.objects.create(
                user=user,
                session_token=str(uuid.uuid4()),
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
                expires_at=timezone.now() + timedelta(days=30),
            )
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'session_token': session.session_token,
                'user_id': user.id,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Additional Views with Previous Fixes
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_check(request):
    """Check if the user is authenticated and return basic user info."""
    return Response({
        "authenticated": True,
        "username": request.user.username,
        "email": request.user.email,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def auth_providers(request):
    """Return a list of available authentication providers."""
    providers = {
        "google": {
            "name": "Google",
            "endpoint": "/api/v1/auth/google/",
            "description": "Sign in with Google OAuth2",
        },
        "local": {
            "name": "Local",
            "endpoint": "/api/auth/login/",
            "description": "Sign in with username and password",
        },
    }
    return Response(providers, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Handle user login and return JWT tokens."""
    username = request.data.get('username')
    password = request.data.get('password')
    user = User.objects.filter(username=username).first()

    if user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        session = Session.objects.create(
            user=user,
            session_token=str(uuid.uuid4()),
            access_token=str(refresh.access_token),
            refresh_token=str(refresh),
            expires_at=timezone.now() + timedelta(days=30),
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': user.id,
        })
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def log_view(request):
    """Simple view to log access and return a message."""
    logger.info(f"Log view accessed by user: {request.user.username}")
    return Response({"message": "This is a log view"}, status=status.HTTP_200_OK)

# Google Auth View
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    logger.info("google_auth view started")
    try:
        id_token_credential = request.data.get('id_token')
        access_token = request.data.get('access_token')

        if not id_token_credential:
            logger.warning("No ID token provided in request")
            return Response({'error': 'No ID token provided'}, status=status.HTTP_400_BAD_REQUEST)

        idinfo = id_token.verify_oauth2_token(id_token_credential, requests.Request(), settings.GOOGLE_CLIENT_ID)
        logger.info("Token verification successful")

        email = idinfo.get('email')
        google_id = idinfo.get('sub')

        if not email:
            logger.warning("Email not provided by Google in token")
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            userprofile = UserProfile.objects.get(google_id=google_id)
            user = userprofile.user
        except UserProfile.DoesNotExist:
            try:
                user = User.objects.get(email=email)
                userprofile = user.userprofile
                userprofile.google_id = google_id
                userprofile.save()
            except User.DoesNotExist:
                username = email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                user = User.objects.create(
                    username=username,
                    email=email,
                    is_active=True,
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', '')
                )
                userprofile = UserProfile.objects.create(user=user, google_id=google_id)

        userprofile.update_from_google_data(idinfo)
        userprofile.access_token = access_token
        userprofile.save()

        refresh = RefreshToken.for_user(user)
        session = Session.objects.create(
            user=user,
            session_token=str(uuid.uuid4()),
            access_token=str(refresh.access_token),
            refresh_token=str(refresh),
            expires_at=timezone.now() + timedelta(days=30),
        )

        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': user.id,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profile_image': userprofile.profile_image.url if userprofile.profile_image else None,
                'positions': userprofile.positions,
                'properties': list(userprofile.properties.values('id', 'name', 'property_id')),
            }
        }
        logger.info(f"Response Data to Frontend: {json.dumps(response_data)}")
        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Unexpected error in google_auth: {str(e)}")
        logger.exception(e)
        return Response({'error': 'Authentication failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Other Views
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "healthy"}, status=200)
